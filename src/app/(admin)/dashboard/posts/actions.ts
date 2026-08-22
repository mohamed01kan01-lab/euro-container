"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PostStatus } from "@prisma/client";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
    return session;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getPosts(filters: {
    status?: PostStatus;
    authorId?: string;
    categoryId?: string;
}) {
    return prisma.post.findMany({
        where: {
            ...(filters.status && { status: filters.status }),
            ...(filters.authorId && { authorId: filters.authorId }),
            ...(filters.categoryId && {
                categories: { some: { categoryId: filters.categoryId } },
            }),
        },
        include: {
            author: { select: { id: true, name: true } },
            categories: {
                include: { category: { select: { id: true, name: true } } },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
    });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createPost(data: {
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    featuredImage?: string;
    seoTitle?: string;
    seoDescription?: string;
    status: PostStatus;
    categoryIds: string[];
    tagIds: string[];
}) {
    const session = await requireAdmin();
    const authorId = session.user.id;

    const post = await prisma.post.create({
        data: {
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt || null,
            content: data.content || null,
            featuredImage: data.featuredImage || null,
            seoTitle: data.seoTitle || null,
            seoDescription: data.seoDescription || null,
            status: data.status,
            authorId,
            publishedAt: data.status === "PUBLISHED" ? new Date() : null,
            categories: {
                create: data.categoryIds.map((categoryId) => ({ categoryId })),
            },
            tags: {
                create: data.tagIds.map((tagId) => ({ tagId })),
            },
        },
    });

    revalidatePath("/dashboard/posts");
    revalidatePath("/blog");
    if (data.status === "PUBLISHED") {
        revalidatePath(`/blog/${post.slug}`);
    }
    return post;
}

export async function updatePost(
    id: string,
    data: {
        title: string;
        slug: string;
        excerpt?: string;
        content?: string;
        featuredImage?: string;
        seoTitle?: string;
        seoDescription?: string;
        status: PostStatus;
        categoryIds: string[];
        tagIds: string[];
    },
) {
    await requireAdmin();

    await prisma.postsOnCategories.deleteMany({ where: { postId: id } });
    await prisma.postsOnTags.deleteMany({ where: { postId: id } });

    const post = await prisma.post.update({
        where: { id },
        data: {
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt || null,
            content: data.content || null,
            featuredImage: data.featuredImage || null,
            seoTitle: data.seoTitle || null,
            seoDescription: data.seoDescription || null,
            status: data.status,
            publishedAt: data.status === "PUBLISHED" ? new Date() : undefined,
            categories: {
                create: data.categoryIds.map((categoryId) => ({ categoryId })),
            },
            tags: {
                create: data.tagIds.map((tagId) => ({ tagId })),
            },
        },
    });

    revalidatePath("/dashboard/posts");
    revalidatePath(`/dashboard/posts/${id}`);
    revalidatePath("/blog");
    revalidatePath(`/blog/${data.slug}`);
    return post;
}

export async function updatePostStatus(id: string, status: PostStatus) {
    await requireAdmin();
    await prisma.post.update({
        where: { id },
        data: {
            status,
            publishedAt: status === "PUBLISHED" ? new Date() : undefined,
        },
    });
    revalidatePath("/dashboard/posts");
    revalidatePath("/blog");
}

export async function deletePost(id: string) {
    await requireAdmin();
    await prisma.post.delete({ where: { id } });
    revalidatePath("/dashboard/posts");
}

export async function getPost(id: string) {
    return prisma.post.findUnique({
        where: { id },
        include: {
            categories: { select: { categoryId: true } },
            tags: { select: { tagId: true } },
        },
    });
}
