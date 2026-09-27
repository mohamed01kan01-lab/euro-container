"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type {
    PaymentStatus,
    RefundStatus,
    ShippingMethod,
    ShippingStatus,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getStripe } from "@/lib/stripe";
import { decryptIban } from "@/lib/security/iban";
import { formatIban } from "@/lib/bank";
import { signedProofUrl } from "@/lib/payment-proofs";
import {
    cancelOrder,
    defer,
    markOrderPaid,
    restockOrder,
} from "@/lib/order-payment";
import {
    sendOrderReceivedEmail,
    sendRefundResolvedEmail,
} from "@/lib/order-emails";

// ─── Garde ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
    return { session, role };
}

export type AdminResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function revalidate(id?: string) {
    revalidatePath("/dashboard/orders");
    if (id) revalidatePath(`/dashboard/orders/${id}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderRow {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    total: number;
    currency: string;
    paymentStatus: PaymentStatus;
    shippingStatus: ShippingStatus;
    createdAt: Date;
}

export interface ShippingAddress {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    [key: string]: unknown;
}

export interface OrderDetail {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    shippingAddress: ShippingAddress;
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    currency: string;
    paymentStatus: PaymentStatus;
    paymentMethod: string | null;
    paymentIntentId: string | null;
    paymentDueAt: Date | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    shippingStatus: ShippingStatus;
    shippingMethod: ShippingMethod;
    trackingNumber: string | null;
    notes: string | null;
    couponCode: string | null;
    createdAt: Date;
    items: {
        id: string;
        name: string;
        price: number;
        quantity: number;
        productId: string;
    }[];
    proofs: {
        id: string;
        originalName: string;
        format: string | null;
        bytes: number;
        createdAt: Date;
    }[];
    refunds: {
        id: string;
        reason: string;
        comment: string | null;
        accountHolder: string | null;
        ibanLast4: string | null;
        hasIban: boolean;
        bic: string | null;
        status: RefundStatus;
        adminNote: string | null;
        createdAt: Date;
        resolvedAt: Date | null;
    }[];
}

/**
 * `shippingAddress` est un Json libre : il peut venir d'un checkout antérieur
 * et ne rien contenir d'attendu. On ne fait donc aucune supposition sur sa forme.
 */
function toAddress(value: unknown): ShippingAddress {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as ShippingAddress;
    }
    return {};
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getOrders(filters: {
    paymentStatus?: PaymentStatus;
    shippingStatus?: ShippingStatus;
    q?: string;
}): Promise<OrderRow[]> {
    await requireAdmin();

    const rows = await prisma.order.findMany({
        where: {
            ...(filters.paymentStatus && {
                paymentStatus: filters.paymentStatus,
            }),
            ...(filters.shippingStatus && {
                shippingStatus: filters.shippingStatus,
            }),
            ...(filters.q && {
                OR: [
                    {
                        orderNumber: {
                            contains: filters.q,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        customerEmail: {
                            contains: filters.q,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        customerName: {
                            contains: filters.q,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        total: Number(o.total),
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        shippingStatus: o.shippingStatus,
        createdAt: o.createdAt,
    }));
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
    await requireAdmin();

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: true,
            coupon: { select: { code: true } },
            paymentProofs: { orderBy: { createdAt: "desc" } },
            refundRequests: { orderBy: { createdAt: "desc" } },
        },
    });
    if (!order) return null;

    return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: toAddress(order.shippingAddress),
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        discount: Number(order.discount),
        total: Number(order.total),
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentIntentId: order.paymentIntentId,
        paymentDueAt: order.paymentDueAt,
        paidAt: order.paidAt,
        cancelledAt: order.cancelledAt,
        shippingStatus: order.shippingStatus,
        shippingMethod: order.shippingMethod,
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        couponCode: order.coupon?.code ?? null,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price),
            quantity: i.quantity,
            productId: i.productId,
        })),
        proofs: order.paymentProofs.map((p) => ({
            id: p.id,
            originalName: p.originalName,
            format: p.format,
            bytes: p.bytes,
            createdAt: p.createdAt,
        })),
        // L'IBAN chiffré ne quitte jamais le serveur : seule la révélation
        // explicite (revealRefundIban) le déchiffre.
        refunds: order.refundRequests.map((r) => ({
            id: r.id,
            reason: r.reason,
            comment: r.comment,
            accountHolder: r.accountHolder,
            ibanLast4: r.ibanLast4,
            hasIban: !!r.ibanEncrypted,
            bic: r.bic,
            status: r.status,
            adminNote: r.adminNote,
            createdAt: r.createdAt,
            resolvedAt: r.resolvedAt,
        })),
    };
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

export async function updateShippingStatus(
    id: string,
    shippingStatus: ShippingStatus,
    trackingNumber?: string,
) {
    await requireAdmin();

    await prisma.order.update({
        where: { id },
        data: {
            shippingStatus,
            ...(trackingNumber !== undefined && {
                trackingNumber: trackingNumber.trim() || null,
            }),
        },
    });
    revalidate(id);
}

export async function updateOrderNotes(id: string, notes: string) {
    await requireAdmin();
    await prisma.order.update({
        where: { id },
        data: { notes: notes.trim() || null },
    });
    revalidate(id);
}

// ─── Paiement ─────────────────────────────────────────────────────────────────

/** Virement reçu sur le compte : la commande passe en « Payé » et le client est prévenu. */
export async function confirmPayment(id: string): Promise<AdminResult> {
    await requireAdmin();
    const done = await markOrderPaid(id);
    revalidate(id);
    return done
        ? { ok: true }
        : { ok: false, error: "Cette commande n'est pas en attente de paiement." };
}

/**
 * Annulation par l'admin (virement jamais reçu, client injoignable…). Stock et
 * usage du coupon sont remis ; une demande de remboursement ouverte est close.
 */
export async function adminCancelOrder(
    id: string,
    notifyCustomer: boolean,
): Promise<AdminResult> {
    await requireAdmin();
    const done = await cancelOrder(
        id,
        ["PENDING", "FAILED", "VERIFYING", "REFUND_REQUESTED"],
        { notifyCustomer },
    );
    if (!done) {
        return {
            ok: false,
            error: "Une commande payée se rembourse, elle ne s'annule pas.",
        };
    }
    await prisma.refundRequest.updateMany({
        where: { orderId: id, status: "REQUESTED" },
        data: {
            status: "REFUSED",
            adminNote: "Commande annulée : aucun paiement reçu.",
            resolvedAt: new Date(),
        },
    });
    revalidate(id);
    return { ok: true };
}

/** Renvoie au client l'email contenant le RIB (commande par virement non payée). */
export async function resendPaymentEmail(id: string): Promise<AdminResult> {
    await requireAdmin();
    const order = await prisma.order.findUnique({
        where: { id },
        select: { paymentMethod: true, paymentStatus: true },
    });
    if (!order) return { ok: false, error: "Commande introuvable." };
    if (order.paymentMethod !== "BANK_TRANSFER" || !["PENDING", "FAILED"].includes(order.paymentStatus)) {
        return { ok: false, error: "Seule une commande par virement en attente peut recevoir le RIB." };
    }
    try {
        await sendOrderReceivedEmail(id);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Envoi impossible." };
    }
}

export async function getProofUrl(proofId: string): Promise<AdminResult<{ url: string }>> {
    await requireAdmin();
    const proof = await prisma.paymentProof.findUnique({ where: { id: proofId } });
    if (!proof) return { ok: false, error: "Justificatif introuvable." };
    try {
        return { ok: true, url: await signedProofUrl(proof.publicId, proof.format) };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Lien indisponible." };
    }
}

// ─── Remboursements ───────────────────────────────────────────────────────────

/** Réservé au rôle ADMIN : l'IBAN n'est déchiffré qu'à la demande. */
export async function revealRefundIban(
    refundId: string,
): Promise<AdminResult<{ iban: string }>> {
    const { session, role } = await requireAdmin();
    if (role !== "ADMIN") {
        return { ok: false, error: "Seul un administrateur peut afficher l'IBAN." };
    }
    const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        select: { ibanEncrypted: true, orderId: true },
    });
    if (!refund?.ibanEncrypted) return { ok: false, error: "Aucun IBAN pour cette demande." };
    try {
        const iban = decryptIban(refund.ibanEncrypted);
        console.info(`[refund] IBAN révélé par ${session.user.email} (commande ${refund.orderId})`);
        return { ok: true, iban: formatIban(iban) };
    } catch (err) {
        console.error("[refund] déchiffrement :", err);
        return { ok: false, error: "Déchiffrement impossible (clé IBAN_ENCRYPTION_KEY modifiée ?)." };
    }
}

/**
 * Remboursement Stripe automatique. La clé d'idempotence empêche un double
 * remboursement si l'admin clique deux fois ou relance après une erreur réseau.
 */
async function refundViaStripe(orderId: string, paymentIntentId: string) {
    const stripe = getStripe(await getSiteSettings());
    await stripe.refunds.create(
        { payment_intent: paymentIntentId, metadata: { orderId } },
        { idempotencyKey: `refund-${orderId}` },
    );
}

export interface ResolveRefundOptions {
    note?: string;
    restock?: boolean;
    /** Carte uniquement : déclencher le remboursement chez Stripe. */
    viaStripe?: boolean;
}

export async function resolveRefund(
    refundId: string,
    outcome: "REFUNDED" | "REFUSED",
    opts: ResolveRefundOptions = {},
): Promise<AdminResult> {
    await requireAdmin();
    const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: {
            order: { select: { id: true, paymentMethod: true, paymentIntentId: true, paymentStatus: true } },
        },
    });
    if (!refund) return { ok: false, error: "Demande introuvable." };
    if (refund.status !== "REQUESTED") return { ok: false, error: "Cette demande est déjà traitée." };

    const { order } = refund;
    const note = opts.note?.trim() || null;

    if (outcome === "REFUNDED" && opts.viaStripe) {
        if (order.paymentMethod !== "STRIPE" || !order.paymentIntentId) {
            return { ok: false, error: "Aucun paiement Stripe à rembourser sur cette commande." };
        }
        try {
            await refundViaStripe(order.id, order.paymentIntentId);
        } catch (err) {
            console.error("[refund] Stripe :", err);
            return { ok: false, error: `Stripe a refusé le remboursement : ${err instanceof Error ? err.message : "erreur inconnue"}` };
        }
    }

    const applied = await prisma.$transaction(async (tx) => {
        const res = await tx.refundRequest.updateMany({
            where: { id: refundId, status: "REQUESTED" },
            data: { status: outcome, adminNote: note, resolvedAt: new Date() },
        });
        if (res.count === 0) return false;
        await tx.order.updateMany({
            where: { id: order.id, paymentStatus: "REFUND_REQUESTED" },
            data:
                outcome === "REFUNDED"
                    ? { paymentStatus: "REFUNDED" }
                    : { paymentStatus: refund.previousStatus },
        });
        return true;
    });
    if (!applied) return { ok: false, error: "Cette demande est déjà traitée." };

    if (outcome === "REFUNDED" && opts.restock) await restockOrder(order.id);
    defer("email remboursement", () => sendRefundResolvedEmail(order.id, outcome, note));
    revalidate(order.id);
    return { ok: true };
}

/** Remboursement à l'initiative de l'admin, sans demande du client. */
export async function refundOrder(
    id: string,
    opts: ResolveRefundOptions = {},
): Promise<AdminResult> {
    await requireAdmin();
    const order = await prisma.order.findUnique({
        where: { id },
        select: { paymentStatus: true, paymentMethod: true, paymentIntentId: true },
    });
    if (!order) return { ok: false, error: "Commande introuvable." };
    if (order.paymentStatus !== "PAID") {
        return { ok: false, error: "Seule une commande payée peut être remboursée." };
    }

    if (opts.viaStripe) {
        if (order.paymentMethod !== "STRIPE" || !order.paymentIntentId) {
            return { ok: false, error: "Aucun paiement Stripe à rembourser sur cette commande." };
        }
        try {
            await refundViaStripe(id, order.paymentIntentId);
        } catch (err) {
            console.error("[refund] Stripe :", err);
            return { ok: false, error: `Stripe a refusé le remboursement : ${err instanceof Error ? err.message : "erreur inconnue"}` };
        }
    }

    const res = await prisma.order.updateMany({
        where: { id, paymentStatus: "PAID" },
        data: { paymentStatus: "REFUNDED" },
    });
    if (res.count === 0) return { ok: false, error: "Cette commande est déjà remboursée." };

    if (opts.restock) await restockOrder(id);
    const note = opts.note?.trim() || null;
    defer("email remboursement", () => sendRefundResolvedEmail(id, "REFUNDED", note));
    revalidate(id);
    return { ok: true };
}
