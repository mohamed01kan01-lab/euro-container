"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma, type CouponType } from "@prisma/client";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouponInput {
    code: string;
    type: CouponType;
    value: number;
    minAmount?: number | null;
    maxUses?: number | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    isActive: boolean;
    productIds: string[];
    categoryIds: string[];
}

export interface SerializedCoupon {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    minAmount: number | null;
    maxUses: number | null;
    usedCount: number;
    /** Format ISO, seules données sérialisables vers un Client Component. */
    startsAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
    productIds: string[];
    categoryIds: string[];
}

function toDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `code` est @unique : l'erreur Prisma P2002 doit devenir un message lisible
 * plutôt que de remonter brute jusqu'au toast.
 */
function rethrowDuplicate(err: unknown): never {
    if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
    ) {
        throw new Error("Ce code promo existe déjà. Choisissez-en un autre.");
    }
    throw err;
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<SerializedCoupon[]> {
    await requireAdmin();

    const rows = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return rows.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        minAmount: c.minAmount === null ? null : Number(c.minAmount),
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        startsAt: c.startsAt?.toISOString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        isActive: c.isActive,
        productIds: c.productIds,
        categoryIds: c.categoryIds,
    }));
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

function toData(input: CouponInput) {
    return {
        code: input.code.trim().toUpperCase(),
        type: input.type,
        // Une livraison offerte n'a pas de montant : on neutralise la valeur.
        value: input.type === "FREE_SHIPPING" ? 0 : input.value,
        minAmount: input.minAmount ?? null,
        maxUses: input.maxUses ?? null,
        startsAt: toDate(input.startsAt),
        expiresAt: toDate(input.expiresAt),
        isActive: input.isActive,
        productIds: input.productIds,
        categoryIds: input.categoryIds,
    };
}

export async function createCoupon(input: CouponInput) {
    await requireAdmin();
    try {
        await prisma.coupon.create({ data: toData(input) });
    } catch (err) {
        rethrowDuplicate(err);
    }
    revalidatePath("/dashboard/coupons");
}

export async function updateCoupon(id: string, input: CouponInput) {
    await requireAdmin();
    try {
        await prisma.coupon.update({ where: { id }, data: toData(input) });
    } catch (err) {
        rethrowDuplicate(err);
    }
    revalidatePath("/dashboard/coupons");
}

export async function toggleCoupon(id: string, isActive: boolean) {
    await requireAdmin();
    await prisma.coupon.update({ where: { id }, data: { isActive } });
    revalidatePath("/dashboard/coupons");
}

export async function deleteCoupon(id: string) {
    await requireAdmin();

    // Order.coupon n'a pas d'onDelete : supprimer un coupon déjà utilisé
    // casserait le rattachement des commandes concernées.
    const orderCount = await prisma.order.count({ where: { couponId: id } });
    if (orderCount > 0) {
        throw new Error(
            `Ce coupon est rattaché à ${orderCount} commande${orderCount > 1 ? "s" : ""}. Désactivez-le plutôt que de le supprimer.`,
        );
    }

    await prisma.coupon.delete({ where: { id } });
    revalidatePath("/dashboard/coupons");
}
