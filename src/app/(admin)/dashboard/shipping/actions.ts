"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
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

function revalidate() {
    revalidatePath("/dashboard/shipping");
    revalidatePath("/checkout");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerializedZone {
    id: string;
    name: string;
    price: number;
    freeAbove: number | null;
    estimatedDays: string | null;
    isActive: boolean;
}

export interface ZoneInput {
    name: string;
    price: number;
    freeAbove?: number | null;
    estimatedDays?: string;
    isActive: boolean;
}

export interface SerializedPickupPoint {
    id: string;
    name: string;
    address: string;
    details: string | null;
    hours: string | null;
    isActive: boolean;
}

export interface PickupPointInput {
    name: string;
    address: string;
    details?: string;
    hours?: string;
    isActive: boolean;
}

function orNull(value?: string) {
    return value?.trim() ? value.trim() : null;
}

// ─── Secteurs ─────────────────────────────────────────────────────────────────

export async function getShippingZones(): Promise<SerializedZone[]> {
    await requireAdmin();
    const rows = await prisma.shippingZone.findMany({
        orderBy: { name: "asc" },
    });
    return rows.map((z) => ({
        id: z.id,
        name: z.name,
        // Decimal ne traverse pas la frontière serveur.
        price: Number(z.price),
        freeAbove: z.freeAbove === null ? null : Number(z.freeAbove),
        estimatedDays: z.estimatedDays,
        isActive: z.isActive,
    }));
}

export async function createShippingZone(input: ZoneInput) {
    await requireAdmin();
    await prisma.shippingZone.create({
        data: {
            name: input.name.trim(),
            price: input.price,
            freeAbove: input.freeAbove ?? null,
            estimatedDays: orNull(input.estimatedDays),
            isActive: input.isActive,
        },
    });
    revalidate();
}

export async function updateShippingZone(id: string, input: ZoneInput) {
    await requireAdmin();
    await prisma.shippingZone.update({
        where: { id },
        data: {
            name: input.name.trim(),
            price: input.price,
            freeAbove: input.freeAbove ?? null,
            estimatedDays: orNull(input.estimatedDays),
            isActive: input.isActive,
        },
    });
    revalidate();
}

export async function deleteShippingZone(id: string) {
    await requireAdmin();

    // Order.shippingZone n'a pas d'onDelete : un secteur déjà utilisé par une
    // commande ne peut pas disparaître sans casser son historique.
    const orders = await prisma.order.count({ where: { shippingZoneId: id } });
    if (orders > 0) {
        throw new Error(
            `Ce secteur est rattaché à ${orders} commande${orders > 1 ? "s" : ""}. Désactivez-le plutôt que de le supprimer.`,
        );
    }

    await prisma.shippingZone.delete({ where: { id } });
    revalidate();
}

// ─── Points de retrait ────────────────────────────────────────────────────────

export async function getPickupPoints(): Promise<SerializedPickupPoint[]> {
    await requireAdmin();
    const rows = await prisma.pickupPoint.findMany({
        orderBy: { name: "asc" },
    });
    return rows.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        details: p.details,
        hours: p.hours,
        isActive: p.isActive,
    }));
}

export async function createPickupPoint(input: PickupPointInput) {
    await requireAdmin();
    await prisma.pickupPoint.create({
        data: {
            name: input.name.trim(),
            address: input.address.trim(),
            details: orNull(input.details),
            hours: orNull(input.hours),
            isActive: input.isActive,
        },
    });
    revalidate();
}

export async function updatePickupPoint(id: string, input: PickupPointInput) {
    await requireAdmin();
    await prisma.pickupPoint.update({
        where: { id },
        data: {
            name: input.name.trim(),
            address: input.address.trim(),
            details: orNull(input.details),
            hours: orNull(input.hours),
            isActive: input.isActive,
        },
    });
    revalidate();
}

export async function deletePickupPoint(id: string) {
    await requireAdmin();

    const orders = await prisma.order.count({ where: { pickupPointId: id } });
    if (orders > 0) {
        throw new Error(
            `Ce point de retrait est rattaché à ${orders} commande${orders > 1 ? "s" : ""}. Désactivez-le plutôt que de le supprimer.`,
        );
    }

    await prisma.pickupPoint.delete({ where: { id } });
    revalidate();
}
