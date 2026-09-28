"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    orderNumber: z.string().trim().min(4).max(40),
    email: z.email(),
});

/**
 * Retrouver une commande sans compte : il faut le numéro ET l'email de la
 * commande. Même message d'erreur dans tous les cas, pour ne pas révéler
 * qu'un numéro existe.
 */
export async function findMyOrder(input: {
    orderNumber: string;
    email: string;
}): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string }> {
    const parsed = schema.safeParse(input);
    const notFound = { ok: false as const, error: "Aucune commande ne correspond à ce numéro et cet email." };
    if (!parsed.success) return notFound;

    const order = await prisma.order.findFirst({
        where: {
            orderNumber: { equals: parsed.data.orderNumber.toUpperCase().replace(/\s+/g, ""), mode: "insensitive" },
            customerEmail: { equals: parsed.data.email, mode: "insensitive" },
        },
        select: { orderNumber: true },
    });
    return order ? { ok: true, orderNumber: order.orderNumber } : notFound;
}
