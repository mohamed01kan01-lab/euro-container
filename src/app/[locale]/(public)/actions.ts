"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Endpoints publics de dépôt. À terme, ces deux actions ont vocation à devenir
 * des Route Handlers pour être consommables depuis une application mobile ;
 * la logique ci-dessous est écrite pour se transposer telle quelle.
 */

// ─── Commentaires ─────────────────────────────────────────────────────────────

const commentSchema = z.object({
    postId: z.string().min(1),
    parentId: z.string().nullable().optional(),
    content: z
        .string()
        .min(2, { message: "Votre commentaire est trop court" })
        .max(5000, { message: "Votre commentaire est trop long" })
        .trim(),
    guestName: z.string().trim().optional(),
    guestEmail: z.string().trim().optional(),
});

export type CommentInput = z.infer<typeof commentSchema>;

export async function submitComment(input: CommentInput) {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(
            parsed.error.issues[0]?.message ?? "Commentaire invalide.",
        );
    }
    const data = parsed.data;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user.id ?? null;

    // Sans compte, l'identité doit être fournie : le schéma autorise l'invité
    // mais il faut de quoi afficher et recontacter l'auteur.
    let guestName: string | null = null;
    let guestEmail: string | null = null;
    if (!userId) {
        if (!data.guestName || data.guestName.length < 2) {
            throw new Error("Indiquez votre nom.");
        }
        if (!data.guestEmail || !z.email().safeParse(data.guestEmail).success) {
            throw new Error("Indiquez une adresse email valide.");
        }
        guestName = data.guestName;
        guestEmail = data.guestEmail;
    }

    const post = await prisma.post.findUnique({
        where: { id: data.postId },
        select: { id: true, slug: true, status: true },
    });
    if (!post || post.status !== "PUBLISHED") {
        throw new Error("Cet article n'accepte pas de commentaire.");
    }

    // Un seul niveau de réponse : on ne répond qu'à un commentaire racine,
    // approuvé, et rattaché à ce même article.
    let parentId: string | null = null;
    if (data.parentId) {
        const parent = await prisma.comment.findUnique({
            where: { id: data.parentId },
            select: { id: true, postId: true, parentId: true, status: true },
        });
        if (
            !parent ||
            parent.postId !== post.id ||
            parent.status !== "APPROVED" ||
            parent.parentId !== null
        ) {
            throw new Error("Impossible de répondre à ce commentaire.");
        }
        parentId = parent.id;
    }

    await prisma.comment.create({
        data: {
            postId: post.id,
            userId,
            guestName,
            guestEmail,
            content: data.content,
            parentId,
            // Jamais issu de l'entrée : toute contribution passe par la modération.
            status: "PENDING",
        },
    });

    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/dashboard/comments");
}

// ─── Avis produits ────────────────────────────────────────────────────────────

const reviewSchema = z.object({
    productId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z
        .string()
        .max(5000, { message: "Votre avis est trop long" })
        .trim()
        .optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function submitReview(input: ReviewInput) {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Avis invalide.");
    }
    const data = parsed.data;

    // ProductReview.userId est requis : pas d'avis anonyme possible.
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        throw new Error("Connectez-vous pour déposer un avis.");
    }

    const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, slug: true, status: true },
    });
    if (!product || product.status !== "PUBLISHED") {
        throw new Error("Ce produit n'accepte pas d'avis.");
    }

    // Le schéma n'a pas de contrainte d'unicité (userId, productId) : le garde-fou
    // contre les avis en série est donc à faire ici.
    const existing = await prisma.productReview.findFirst({
        where: { productId: product.id, userId: session.user.id },
        select: { id: true },
    });
    if (existing) {
        throw new Error("Vous avez déjà donné votre avis sur ce produit.");
    }

    await prisma.productReview.create({
        data: {
            productId: product.id,
            userId: session.user.id,
            rating: data.rating,
            comment: data.comment || null,
            status: "PENDING",
        },
    });

    revalidatePath(`/product/${product.slug}`);
    revalidatePath("/dashboard/reviews");
}
