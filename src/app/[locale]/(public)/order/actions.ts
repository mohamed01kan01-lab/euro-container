"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { isBankTransferConfigured, isStripeConfigured } from "@/lib/payment";
import { isValidBic, isValidIban, normalizeBic, normalizeIban } from "@/lib/bank";
import { encryptIban } from "@/lib/security/iban";
import { cancelOrder, defer, startCardPayment } from "@/lib/order-payment";
import {
    notifyAdmin,
    sendOrderReceivedEmail,
    sendRefundRequestedEmail,
    sendTransferDeclaredEmail,
} from "@/lib/order-emails";

/**
 * Actions de la page /order/[orderNumber]. La référence de commande fait office
 * de clé d'accès (8 caractères aléatoires, cf. order-reference.ts).
 *
 * Toutes sont idempotentes : rejouer une action déjà appliquée renvoie un
 * succès sans effet de bord (pas de second email, pas de double transition).
 */

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function findOrder(orderNumber: string) {
    return prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true, paymentStatus: true, paymentMethod: true, paymentDueAt: true },
    });
}

function refresh(orderNumber: string) {
    revalidatePath(`/order/${orderNumber}`);
    revalidatePath("/dashboard/orders");
}

const NOT_FOUND = { ok: false as const, error: "Commande introuvable." };

// ─── Virement ────────────────────────────────────────────────────────────────

/** « J'ai effectué le virement » : le justificatif est facultatif. */
export async function declareTransfer(orderNumber: string): Promise<ActionResult> {
    const order = await findOrder(orderNumber);
    if (!order) return NOT_FOUND;
    if (order.paymentStatus === "VERIFYING" || order.paymentStatus === "PAID") {
        return { ok: true };
    }

    const res = await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] } },
        data: { paymentStatus: "VERIFYING", paymentMethod: "BANK_TRANSFER" },
    });
    if (res.count === 0) {
        return { ok: false, error: "Cette commande ne peut plus être modifiée." };
    }

    defer("email virement signalé", () => sendTransferDeclaredEmail(order.id));
    defer("notif admin virement", () => notifyAdmin(order.id, "TRANSFER_DECLARED"));
    refresh(orderNumber);
    return { ok: true };
}

/** Bascule d'une commande carte non payée vers le virement. */
export async function switchToBankTransfer(orderNumber: string): Promise<ActionResult> {
    const [order, settings] = await Promise.all([findOrder(orderNumber), getSiteSettings()]);
    if (!order) return NOT_FOUND;
    if (!isBankTransferConfigured(settings)) {
        return { ok: false, error: "Le virement n'est pas disponible." };
    }
    if (order.paymentMethod === "BANK_TRANSFER") return { ok: true };

    const res = await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] } },
        data: {
            paymentMethod: "BANK_TRANSFER",
            paymentStatus: "PENDING",
            paymentDueAt:
                order.paymentDueAt ??
                new Date(Date.now() + settings.paymentDueDays * 24 * 60 * 60 * 1000),
        },
    });
    if (res.count === 0) {
        return { ok: false, error: "Cette commande ne peut plus être modifiée." };
    }

    defer("email commande reçue", () => sendOrderReceivedEmail(order.id));
    defer("notif admin commande", () => notifyAdmin(order.id, "NEW_ORDER"));
    refresh(orderNumber);
    return { ok: true };
}

// ─── Carte ───────────────────────────────────────────────────────────────────

export async function payByCard(
    orderNumber: string,
    locale: string,
): Promise<ActionResult<{ url: string }>> {
    const [order, settings] = await Promise.all([findOrder(orderNumber), getSiteSettings()]);
    if (!order) return NOT_FOUND;
    if (!isStripeConfigured(settings)) {
        return { ok: false, error: "Le paiement par carte n'est pas disponible." };
    }
    try {
        const url = await startCardPayment(order.id, locale);
        return { ok: true, url };
    } catch (err) {
        console.error("[order] payByCard :", err);
        return {
            ok: false,
            error:
                err instanceof Error && err.message.startsWith("Cette commande")
                    ? err.message
                    : "Le paiement par carte est momentanément indisponible. Réessayez ou payez par virement.",
        };
    }
}

// ─── Annulation / remboursement ──────────────────────────────────────────────

/** Rien n'a été payé : annulation immédiate, le stock est remis en vente. */
export async function cancelMyOrder(orderNumber: string): Promise<ActionResult> {
    const order = await findOrder(orderNumber);
    if (!order) return NOT_FOUND;
    if (order.paymentStatus === "CANCELLED") return { ok: true };

    const done = await cancelOrder(order.id, ["PENDING", "FAILED"], { notifyCustomer: true });
    if (!done) {
        return {
            ok: false,
            error: "Un paiement est en cours sur cette commande : faites plutôt une demande de remboursement.",
        };
    }
    defer("notif admin annulation", () => notifyAdmin(order.id, "CANCELLED_BY_CUSTOMER"));
    refresh(orderNumber);
    return { ok: true };
}

const refundSchema = z.object({
    reason: z.string().trim().min(2, { message: "Indiquez le motif de votre demande." }).max(200),
    comment: z.string().trim().max(1000).optional(),
    accountHolder: z.string().trim().max(120).optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
});

export type RefundInput = z.input<typeof refundSchema>;

export async function requestRefund(
    orderNumber: string,
    input: RefundInput,
): Promise<ActionResult> {
    const parsed = refundSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
    }
    const data = parsed.data;

    const order = await findOrder(orderNumber);
    if (!order) return NOT_FOUND;
    if (order.paymentStatus === "REFUND_REQUESTED") return { ok: true };
    if (order.paymentStatus !== "VERIFYING" && order.paymentStatus !== "PAID") {
        return { ok: false, error: "Aucun paiement à rembourser sur cette commande." };
    }

    // Une carte est remboursée sur la carte : on ne demande un IBAN que pour un virement.
    const needsIban = order.paymentMethod !== "STRIPE";
    let bankFields: {
        accountHolder: string;
        ibanEncrypted: string;
        ibanLast4: string;
        bic: string | null;
    } | null = null;

    if (needsIban) {
        if (!data.accountHolder || data.accountHolder.length < 2) {
            return { ok: false, error: "Indiquez le titulaire du compte." };
        }
        if (!data.iban || !isValidIban(data.iban)) {
            return { ok: false, error: "IBAN invalide : vérifiez sa saisie." };
        }
        if (data.bic && !isValidBic(data.bic)) {
            return { ok: false, error: "BIC invalide : 8 ou 11 caractères." };
        }
        const iban = normalizeIban(data.iban);
        let ibanEncrypted: string;
        try {
            ibanEncrypted = encryptIban(iban);
        } catch (err) {
            console.error("[order] chiffrement IBAN :", err);
            return { ok: false, error: "Demande momentanément impossible. Contactez-nous." };
        }
        bankFields = {
            accountHolder: data.accountHolder,
            ibanEncrypted,
            ibanLast4: iban.slice(-4),
            bic: data.bic ? normalizeBic(data.bic) : null,
        };
    }

    const previousStatus = order.paymentStatus;
    const created = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
            where: { id: order.id, paymentStatus: previousStatus },
            data: { paymentStatus: "REFUND_REQUESTED" },
        });
        if (res.count === 0) return false;
        await tx.refundRequest.create({
            data: {
                orderId: order.id,
                reason: data.reason,
                comment: data.comment || null,
                previousStatus,
                ...bankFields,
            },
        });
        return true;
    });
    if (!created) return { ok: true }; // demande concurrente déjà enregistrée

    defer("email demande remboursement", () => sendRefundRequestedEmail(order.id));
    defer("notif admin remboursement", () => notifyAdmin(order.id, "REFUND_REQUESTED"));
    refresh(orderNumber);
    return { ok: true };
}
