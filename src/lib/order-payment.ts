import { after } from "next/server";
import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { PAYABLE_STATUSES } from "@/lib/order-status";
import { createCheckoutSession, getStripe } from "@/lib/stripe";
import {
    notifyAdmin,
    sendOrderCancelledEmail,
    sendOrderPaidEmail,
} from "@/lib/order-emails";

/**
 * Cœur des transitions de paiement, partagé par les actions client, l'admin et
 * le webhook Stripe. Ce fichier n'est PAS un module "use server" : rien ici
 * n'est appelable directement depuis le navigateur.
 *
 * Chaque transition est un `updateMany` conditionné par le statut courant :
 * deux appels concurrents (retour Stripe + webhook, double clic admin) ne
 * peuvent la réussir qu'une fois, et seul celui qui la réussit déclenche les
 * effets de bord (emails, remise en stock).
 */

/** Emails envoyés après la réponse : un email en échec ne casse jamais une action. */
export function defer(label: string, task: () => Promise<unknown>) {
    after(async () => {
        try {
            await task();
        } catch (err) {
            console.error(`[orders] ${label} :`, err);
        }
    });
}

async function restock(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
        // updateMany : un produit supprimé depuis ne doit pas faire échouer l'annulation.
        if (item.variantId) {
            await tx.productVariant.updateMany({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
            });
        } else {
            await tx.product.updateMany({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            });
        }
    }
}

// ─── Paiement confirmé ───────────────────────────────────────────────────────

export async function markOrderPaid(
    orderId: string,
    opts: { paymentIntentId?: string | null } = {},
): Promise<boolean> {
    const res = await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { in: PAYABLE_STATUSES } },
        data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            ...(opts.paymentIntentId && { paymentIntentId: opts.paymentIntentId }),
        },
    });
    if (res.count === 0) return false;

    defer("email paiement reçu", () => sendOrderPaidEmail(orderId));
    if (opts.paymentIntentId) {
        defer("notif admin carte", () => notifyAdmin(orderId, "PAID_BY_CARD"));
    }
    return true;
}

// ─── Annulation ──────────────────────────────────────────────────────────────

export async function cancelOrder(
    orderId: string,
    allowed: PaymentStatus[],
    opts: { notifyCustomer: boolean },
): Promise<boolean> {
    const cancelled = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
            where: { id: orderId, paymentStatus: { in: allowed } },
            data: {
                paymentStatus: "CANCELLED",
                shippingStatus: "CANCELLED",
                cancelledAt: new Date(),
            },
        });
        if (res.count === 0) return null;

        await restock(tx, orderId);
        const order = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            select: { couponId: true, stripeSessionId: true },
        });
        if (order.couponId) {
            await tx.coupon.updateMany({
                where: { id: order.couponId, usedCount: { gt: 0 } },
                data: { usedCount: { decrement: 1 } },
            });
        }
        return order;
    });
    if (!cancelled) return false;

    // Une session Stripe encore ouverte permettrait de payer une commande annulée.
    if (cancelled.stripeSessionId) {
        const sessionId = cancelled.stripeSessionId;
        defer("expiration session Stripe", async () => {
            const stripe = getStripe(await getSiteSettings());
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.status === "open") {
                await stripe.checkout.sessions.expire(sessionId);
            }
        });
    }
    if (opts.notifyCustomer) {
        defer("email annulation", () => sendOrderCancelledEmail(orderId));
    }
    return true;
}

/** Remise en stock hors annulation (remboursement d'une commande payée). */
export async function restockOrder(orderId: string) {
    await prisma.$transaction((tx) => restock(tx, orderId));
}

// ─── Stripe ──────────────────────────────────────────────────────────────────

/**
 * Renvoie l'URL de paiement Stripe. Une session encore ouverte est réutilisée :
 * recliquer sur « Payer » ne crée pas de nouvelle session.
 */
export async function startCardPayment(
    orderId: string,
    locale: string,
): Promise<string> {
    const [order, settings] = await Promise.all([
        prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { items: true },
        }),
        getSiteSettings(),
    ]);
    if (!PAYABLE_STATUSES.includes(order.paymentStatus) || order.paymentStatus === "VERIFYING") {
        throw new Error("Cette commande ne peut plus être payée en ligne.");
    }

    const stripe = getStripe(settings);
    if (order.stripeSessionId) {
        const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (existing.status === "open" && existing.url) {
            if (order.paymentMethod !== "STRIPE") {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { paymentMethod: "STRIPE" },
                });
            }
            return existing.url;
        }
        if (existing.payment_status === "paid") {
            await markOrderPaid(order.id, { paymentIntentId: paymentIntentId(existing) });
            throw new Error("Cette commande est déjà payée.");
        }
    }

    const session = await createCheckoutSession(
        settings,
        {
            id: order.id,
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            currency: order.currency,
            total: Number(order.total),
            discount: Number(order.discount),
            shippingCost: Number(order.shippingCost),
            items: order.items.map((i) => ({
                name: i.name,
                price: Number(i.price),
                quantity: i.quantity,
            })),
        },
        locale,
    );
    if (!session.url) throw new Error("Stripe n'a pas renvoyé de page de paiement.");

    await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id, paymentMethod: "STRIPE" },
    });
    return session.url;
}

function paymentIntentId(session: { payment_intent: unknown }): string | null {
    const pi = session.payment_intent;
    if (typeof pi === "string") return pi;
    if (pi && typeof pi === "object" && "id" in pi) return String(pi.id);
    return null;
}

/**
 * Vérifie une session Stripe et confirme la commande si elle est payée. Appelée
 * au retour du client (sans attendre le webhook) et par le webhook : les deux
 * chemins convergent vers `markOrderPaid`, qui ne réussit qu'une fois.
 */
export async function syncStripeSession(sessionId: string): Promise<boolean> {
    const stripe = getStripe(await getSiteSettings());
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;
    if (!orderId || session.payment_status !== "paid") return false;
    return markOrderPaid(orderId, { paymentIntentId: paymentIntentId(session) });
}
