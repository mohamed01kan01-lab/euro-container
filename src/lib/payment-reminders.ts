import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { cancelOrder } from "@/lib/order-payment";
import { sendPaymentReminderEmail } from "@/lib/order-emails";

/**
 * Relances des commandes impayées : automatiques (cron Vercel, voir
 * app/api/cron/payment-reminders) et manuelles (bouton admin).
 *
 * Calendrier automatique, pensé pour un cron quotidien (plan Hobby) :
 * - carte : 1re relance dès 1 h après la commande, 2e 48 h plus tard ;
 * - virement : 1re relance 2 jours après la commande, 2e (« dernier rappel »)
 *   la veille de la date limite de réservation.
 * Au-delà de 2 relances automatiques, seul l'admin peut relancer.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_AUTO = 2;
/** Borne le travail d'une exécution (durée max d'une fonction Vercel). */
const BATCH = 50;

const UNPAID: PaymentStatus[] = ["PENDING", "FAILED"];
const REMINDABLE_METHODS = ["BANK_TRANSFER", "STRIPE"];

interface Candidate {
    id: string;
    paymentMethod: string | null;
    createdAt: Date;
    paymentDueAt: Date | null;
    paymentReminderCount: number;
    lastPaymentReminderAt: Date | null;
}

/** Relance due pour cette commande, ou null. `final` = dernier rappel. */
function dueReminder(o: Candidate, now: number): { final: boolean } | null {
    const age = now - o.createdAt.getTime();
    const sinceLast = o.lastPaymentReminderAt ? now - o.lastPaymentReminderAt.getTime() : Infinity;
    const isCard = o.paymentMethod === "STRIPE";

    if (o.paymentReminderCount === 0) {
        return age >= (isCard ? HOUR : 2 * DAY) ? { final: false } : null;
    }
    if (o.paymentReminderCount === 1) {
        if (isCard) return sinceLast >= 2 * DAY ? { final: true } : null;
        if (sinceLast < DAY) return null;
        // Veille de l'échéance : 36 h de marge pour qu'un cron quotidien la capte.
        if (o.paymentDueAt) {
            return o.paymentDueAt.getTime() - now <= 36 * HOUR ? { final: true } : null;
        }
        return sinceLast >= 3 * DAY ? { final: true } : null;
    }
    return null;
}

/**
 * Réserve la relance en base AVANT l'envoi : le compteur attendu sert de
 * verrou optimiste, deux exécutions concurrentes n'envoient qu'un email.
 */
async function claim(orderId: string, expectedCount: number | null): Promise<boolean> {
    const res = await prisma.order.updateMany({
        where: {
            id: orderId,
            paymentStatus: { in: UNPAID },
            paymentMethod: { in: REMINDABLE_METHODS },
            ...(expectedCount !== null && { paymentReminderCount: expectedCount }),
        },
        data: {
            paymentReminderCount: { increment: 1 },
            lastPaymentReminderAt: new Date(),
        },
    });
    return res.count === 1;
}

/** Relance manuelle depuis l'admin : pas de calendrier, toujours envoyée. */
export async function sendManualReminder(orderId: string): Promise<boolean> {
    if (!(await claim(orderId, null))) return false;
    const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { paymentDueAt: true },
    });
    const final = !!order.paymentDueAt && order.paymentDueAt.getTime() - Date.now() <= 36 * HOUR;
    await sendPaymentReminderEmail(orderId, final);
    return true;
}

export interface ReminderRunReport {
    reminded: number;
    cancelled: number;
    failed: number;
}

export async function runPaymentReminders(): Promise<ReminderRunReport> {
    const settings = await getSiteSettings();
    const now = Date.now();
    const report: ReminderRunReport = { reminded: 0, cancelled: 0, failed: 0 };

    // ─── Annulation des commandes impayées expirées ──────────────────────────
    // Les commandes « en vérification » ne sont jamais concernées : un virement
    // signalé peut être en transit.
    if (settings.autoCancelUnpaid) {
        const limit = new Date(now - settings.autoCancelGraceDays * DAY);
        const expired = await prisma.order.findMany({
            where: { paymentStatus: { in: UNPAID }, paymentDueAt: { lt: limit } },
            select: { id: true },
            take: BATCH,
        });
        for (const { id } of expired) {
            try {
                if (await cancelOrder(id, UNPAID, { notifyCustomer: true, reason: "unpaid" })) {
                    report.cancelled++;
                }
            } catch (err) {
                report.failed++;
                console.error(`[reminders] annulation ${id} :`, err);
            }
        }
    }

    // ─── Relances ────────────────────────────────────────────────────────────
    if (settings.paymentRemindersEnabled) {
        const candidates = await prisma.order.findMany({
            where: {
                paymentStatus: { in: UNPAID },
                paymentMethod: { in: REMINDABLE_METHODS },
                paymentReminderCount: { lt: MAX_AUTO },
                createdAt: { lte: new Date(now - HOUR) },
            },
            select: {
                id: true,
                paymentMethod: true,
                createdAt: true,
                paymentDueAt: true,
                paymentReminderCount: true,
                lastPaymentReminderAt: true,
            },
            orderBy: { createdAt: "asc" },
            take: BATCH * 4,
        });

        for (const order of candidates) {
            if (report.reminded >= BATCH) break;
            const due = dueReminder(order, now);
            if (!due) continue;
            try {
                if (!(await claim(order.id, order.paymentReminderCount))) continue;
                await sendPaymentReminderEmail(order.id, due.final);
                report.reminded++;
            } catch (err) {
                report.failed++;
                console.error(`[reminders] relance ${order.id} :`, err);
            }
        }
    }

    return report;
}
