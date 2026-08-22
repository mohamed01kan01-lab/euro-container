"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PaymentStatus, ShippingStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Garde ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
    return session;
}

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
    shippingStatus: ShippingStatus;
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
        shippingStatus: order.shippingStatus,
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

/**
 * Remboursement : marquage en base uniquement. L'appel réel au PSP viendra avec
 * la section 6 (Stripe / FeexPay), via order.paymentIntentId.
 */
export async function refundOrder(id: string) {
    await requireAdmin();

    const order = await prisma.order.findUnique({
        where: { id },
        select: { paymentStatus: true },
    });
    if (!order) throw new Error("Commande introuvable.");
    if (order.paymentStatus === "REFUNDED") {
        throw new Error("Cette commande est déjà remboursée.");
    }
    if (order.paymentStatus !== "PAID") {
        throw new Error(
            "Seule une commande payée peut être remboursée.",
        );
    }

    await prisma.order.update({
        where: { id },
        data: { paymentStatus: "REFUNDED" },
    });
    revalidate(id);
}
