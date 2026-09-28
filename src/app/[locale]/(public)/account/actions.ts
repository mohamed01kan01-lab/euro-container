"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Suppression du compte (droit à l'effacement, RGPD). Les commandes sont
 * conservées, détachées du compte : la loi impose de garder les pièces
 * comptables (10 ans). Réservé aux clients : un compte de l'équipe se gère
 * depuis le dashboard.
 */
export async function deleteMyAccount(
    confirmation: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { ok: false, error: "Vous n'êtes plus connecté." };

    const role = (session.user as { role?: string }).role;
    if (role === "ADMIN" || role === "EDITOR") {
        return { ok: false, error: "Un compte de l'équipe ne peut pas être supprimé ici." };
    }
    if (confirmation.trim().toUpperCase() !== "SUPPRIMER") {
        return { ok: false, error: "Saisissez SUPPRIMER pour confirmer." };
    }

    await prisma.$transaction([
        prisma.order.updateMany({ where: { userId: session.user.id }, data: { userId: null } }),
        // Sessions et comptes d'authentification sont supprimés en cascade.
        prisma.user.delete({ where: { id: session.user.id } }),
    ]);
    return { ok: true };
}
