"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ReviewStatus } from "@prisma/client";
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

export interface ReviewRow {
    id: string;
    rating: number;
    comment: string | null;
    status: ReviewStatus;
    createdAt: Date;
    authorName: string;
    authorEmail: string;
    product: { name: string; slug: string };
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getReviews(filters: {
    status?: ReviewStatus;
    rating?: number;
}): Promise<ReviewRow[]> {
    await requireAdmin();

    const rows = await prisma.productReview.findMany({
        where: {
            ...(filters.status && { status: filters.status }),
            ...(filters.rating && { rating: filters.rating }),
        },
        include: {
            user: { select: { name: true, email: true } },
            product: { select: { name: true, slug: true } },
        },
        // Les avis à traiter d'abord.
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 200,
    });

    return rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        authorName: r.user.name,
        authorEmail: r.user.email,
        product: r.product,
    }));
}

export async function getReviewStats() {
    await requireAdmin();

    const [counts, approved] = await Promise.all([
        prisma.productReview.groupBy({
            by: ["status"],
            _count: { status: true },
        }),
        prisma.productReview.aggregate({
            where: { status: "APPROVED" },
            _avg: { rating: true },
        }),
    ]);

    return {
        pending: counts.find((c) => c.status === "PENDING")?._count.status ?? 0,
        total: counts.reduce((sum, c) => sum + c._count.status, 0),
        // Moyenne calculée sur les seuls avis publiés.
        average: approved._avg.rating ?? 0,
    };
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

async function revalidateFor(id: string) {
    const review = await prisma.productReview.findUnique({
        where: { id },
        select: { product: { select: { slug: true } } },
    });
    revalidatePath("/dashboard/reviews");
    if (review) revalidatePath(`/product/${review.product.slug}`);
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
    await requireAdmin();
    await prisma.productReview.update({ where: { id }, data: { status } });
    await revalidateFor(id);
}

export async function deleteReview(id: string) {
    await requireAdmin();

    const review = await prisma.productReview.findUnique({
        where: { id },
        select: { product: { select: { slug: true } } },
    });
    if (!review) throw new Error("Avis introuvable.");

    await prisma.productReview.delete({ where: { id } });

    revalidatePath("/dashboard/reviews");
    revalidatePath(`/product/${review.product.slug}`);
}
