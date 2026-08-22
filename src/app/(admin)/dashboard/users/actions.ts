"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountCreatedEmail } from "@/lib/email";

// ─── Gardes ───────────────────────────────────────────────────────────────────

/** Lecture : ADMIN et EDITOR, comme le reste du dashboard. */
async function requireDashboard() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
    return session;
}

/**
 * Écriture : ADMIN uniquement. L'ACL de auth-permissions.ts rejetterait de toute
 * façon un EDITOR côté better-auth, mais on refuse ici pour renvoyer un message
 * clair plutôt qu'une erreur d'API.
 */
async function requireUserWrite() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || role !== "ADMIN") {
        throw new Error("Seul un administrateur peut effectuer cette action.");
    }
    return session;
}

/** Empêche de se verrouiller hors du dashboard en retirant le dernier ADMIN. */
async function assertNotLastAdmin(userId: string) {
    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (target?.role !== "ADMIN") return;

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
        throw new Error(
            "Impossible : c'est le dernier administrateur. Nommez un autre administrateur d'abord.",
        );
    }
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getUsers(filters: {
    role?: Role;
    status?: "ACTIVE" | "BANNED" | "UNVERIFIED";
    q?: string;
}) {
    await requireDashboard();

    return prisma.user.findMany({
        where: {
            ...(filters.role && { role: filters.role }),
            ...(filters.status === "BANNED" && { banned: true }),
            ...(filters.status === "ACTIVE" && {
                banned: { not: true },
                emailVerified: true,
            }),
            ...(filters.status === "UNVERIFIED" && { emailVerified: false }),
            ...(filters.q && {
                OR: [
                    { name: { contains: filters.q, mode: "insensitive" as const } },
                    { email: { contains: filters.q, mode: "insensitive" as const } },
                ],
            }),
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            banned: true,
            banReason: true,
            emailVerified: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });
}

// ─── Création ─────────────────────────────────────────────────────────────────

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
}): Promise<{ emailSent: boolean; warning?: string }> {
    const session = await requireUserWrite();

    await auth.api.createUser({
        body: {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
        },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");

    // Le compte existe : un échec d'envoi ne doit pas remonter comme un échec de
    // création. On renvoie un avertissement que l'appelant affiche en toast.
    try {
        await sendAccountCreatedEmail({
            email: data.email,
            name: data.name,
            role: data.role,
            password: data.password,
            invitedBy: session.user.name,
        });
    } catch (err) {
        console.error("[users] Envoi de l'email d'accès échoué :", err);
        const reason = err instanceof Error ? ` ${err.message}` : "";
        return {
            emailSent: false,
            warning: `Compte créé, mais l'email n'a pas pu être envoyé.${reason} Transmettez les identifiants manuellement.`,
        };
    }

    return { emailSent: true };
}

// ─── Rôle ─────────────────────────────────────────────────────────────────────

export async function setUserRole(userId: string, role: Role) {
    const session = await requireUserWrite();

    if (userId === session.user.id) {
        throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    }
    if (role !== "ADMIN") {
        await assertNotLastAdmin(userId);
    }

    await auth.api.setRole({
        body: { userId, role },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");
}

// ─── Suspension ───────────────────────────────────────────────────────────────

export async function banUser(userId: string, banReason?: string) {
    const session = await requireUserWrite();

    if (userId === session.user.id) {
        throw new Error("Vous ne pouvez pas suspendre votre propre compte.");
    }
    await assertNotLastAdmin(userId);

    await auth.api.banUser({
        body: { userId, ...(banReason && { banReason }) },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");
}

export async function unbanUser(userId: string) {
    await requireUserWrite();

    await auth.api.unbanUser({
        body: { userId },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");
}

// ─── Mot de passe ─────────────────────────────────────────────────────────────

export async function setUserPassword(userId: string, newPassword: string) {
    await requireUserWrite();

    await auth.api.setUserPassword({
        body: { userId, newPassword },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function removeUser(userId: string) {
    const session = await requireUserWrite();

    if (userId === session.user.id) {
        throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }
    await assertNotLastAdmin(userId);

    // Post.author n'a pas d'onDelete : la contrainte bloque la suppression d'un
    // auteur ayant des posts. On le dit clairement plutôt que de laisser fuiter
    // une erreur Prisma.
    const postCount = await prisma.post.count({ where: { authorId: userId } });
    if (postCount > 0) {
        throw new Error(
            `Cet utilisateur est l'auteur de ${postCount} post${postCount > 1 ? "s" : ""}. Réattribuez-les ou suspendez le compte.`,
        );
    }

    await auth.api.removeUser({
        body: { userId },
        headers: await headers(),
    });

    revalidatePath("/dashboard/users");
}
