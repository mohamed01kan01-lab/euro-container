"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { CommentStatus } from "@prisma/client";
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

export interface CommentRow {
    id: string;
    content: string;
    status: CommentStatus;
    createdAt: Date;
    authorName: string;
    authorEmail: string | null;
    isGuest: boolean;
    isReply: boolean;
    post: { title: string; slug: string };
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getComments(filters: {
    status?: CommentStatus;
}): Promise<CommentRow[]> {
    await requireAdmin();

    const rows = await prisma.comment.findMany({
        where: { ...(filters.status && { status: filters.status }) },
        include: {
            user: { select: { name: true, email: true } },
            post: { select: { title: true, slug: true } },
        },
        // Une file de modération montre d'abord ce qui reste à traiter.
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 200,
    });

    return rows.map((c) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt,
        authorName: c.user?.name ?? c.guestName ?? "Anonyme",
        authorEmail: c.user?.email ?? c.guestEmail ?? null,
        isGuest: !c.userId,
        isReply: c.parentId !== null,
        post: c.post,
    }));
}

export async function getCommentCounts() {
    await requireAdmin();
    const counts = await prisma.comment.groupBy({
        by: ["status"],
        _count: { status: true },
    });
    return {
        pending:
            counts.find((c) => c.status === "PENDING")?._count.status ?? 0,
        total: counts.reduce((sum, c) => sum + c._count.status, 0),
    };
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

async function revalidateFor(id: string) {
    const comment = await prisma.comment.findUnique({
        where: { id },
        select: { post: { select: { slug: true } } },
    });
    revalidatePath("/dashboard/comments");
    if (comment) revalidatePath(`/blog/${comment.post.slug}`);
}

export async function setCommentStatus(id: string, status: CommentStatus) {
    await requireAdmin();
    await prisma.comment.update({ where: { id }, data: { status } });
    await revalidateFor(id);
}

export async function deleteComment(id: string) {
    await requireAdmin();

    const comment = await prisma.comment.findUnique({
        where: { id },
        select: { id: true, post: { select: { slug: true } } },
    });
    if (!comment) throw new Error("Commentaire introuvable.");

    // CommentReplies n'a pas d'onDelete : sans suppression explicite des
    // réponses, la contrainte de clé étrangère fait échouer la suppression.
    await prisma.$transaction([
        prisma.comment.deleteMany({ where: { parentId: id } }),
        prisma.comment.delete({ where: { id } }),
    ]);

    revalidatePath("/dashboard/comments");
    revalidatePath(`/blog/${comment.post.slug}`);
}
