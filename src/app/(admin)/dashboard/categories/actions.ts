"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

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
    revalidatePath("/dashboard/categories");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerializedCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    seoTitle: string | null;
    seoDesc: string | null;
    count: number;
    depth: number;
}

export interface SerializedTag {
    id: string;
    name: string;
    slug: string;
    count: number;
}

export interface CategoryInput {
    name: string;
    slug: string;
    description?: string;
    parentId?: string | null;
    seoTitle?: string;
    seoDesc?: string;
}

/**
 * Trie les catégories en arbre aplati (parents suivis de leurs enfants) et
 * calcule la profondeur, pour permettre l'indentation dans la table.
 */
function flattenTree<
    T extends { id: string; parentId: string | null; name: string },
>(rows: T[]): (T & { depth: number })[] {
    const byParent = new Map<string | null, T[]>();
    for (const row of rows) {
        const siblings = byParent.get(row.parentId) ?? [];
        siblings.push(row);
        byParent.set(row.parentId, siblings);
    }

    const result: (T & { depth: number })[] = [];
    const walk = (parentId: string | null, depth: number) => {
        const children = byParent.get(parentId) ?? [];
        for (const child of children) {
            result.push({ ...child, depth });
            walk(child.id, depth + 1);
        }
    };
    walk(null, 0);

    // Filet de sécurité : une catégorie dont le parent aurait disparu du jeu de
    // résultats ne doit pas être perdue silencieusement.
    if (result.length < rows.length) {
        const seen = new Set(result.map((r) => r.id));
        for (const row of rows) {
            if (!seen.has(row.id)) result.push({ ...row, depth: 0 });
        }
    }
    return result;
}

/** Remonte la chaîne des parents pour empêcher les cycles. */
async function assertNoCycle(
    table: "productCategory" | "postCategory",
    id: string,
    parentId: string | null,
) {
    if (!parentId) return;
    if (parentId === id) {
        throw new Error("Une catégorie ne peut pas être son propre parent.");
    }

    let cursor: string | null = parentId;
    const visited = new Set<string>([id]);

    while (cursor) {
        if (visited.has(cursor)) {
            throw new Error(
                "Hiérarchie invalide : cette catégorie est déjà un ancêtre de la catégorie choisie.",
            );
        }
        visited.add(cursor);

        const parent: { parentId: string | null } | null =
            table === "productCategory"
                ? await prisma.productCategory.findUnique({
                      where: { id: cursor },
                      select: { parentId: true },
                  })
                : await prisma.postCategory.findUnique({
                      where: { id: cursor },
                      select: { parentId: true },
                  });

        cursor = parent?.parentId ?? null;
    }
}

function uniqueSlug(input: CategoryInput) {
    return input.slug.trim() ? generateSlug(input.slug) : generateSlug(input.name);
}

// ─── Catégories produits ──────────────────────────────────────────────────────

export async function getProductCategories(): Promise<SerializedCategory[]> {
    await requireAdmin();
    const rows = await prisma.productCategory.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            seoTitle: true,
            seoDesc: true,
            _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
    });

    return flattenTree(rows).map(({ _count, ...row }) => ({
        ...row,
        count: _count.products,
    }));
}

export async function createProductCategory(input: CategoryInput) {
    await requireAdmin();
    await prisma.productCategory.create({
        data: {
            name: input.name,
            slug: uniqueSlug(input),
            description: input.description || null,
            parentId: input.parentId || null,
            seoTitle: input.seoTitle || null,
            seoDesc: input.seoDesc || null,
        },
    });
    revalidate();
}

export async function updateProductCategory(id: string, input: CategoryInput) {
    await requireAdmin();
    await assertNoCycle("productCategory", id, input.parentId ?? null);

    await prisma.productCategory.update({
        where: { id },
        data: {
            name: input.name,
            slug: uniqueSlug(input),
            description: input.description || null,
            parentId: input.parentId || null,
            seoTitle: input.seoTitle || null,
            seoDesc: input.seoDesc || null,
        },
    });
    revalidate();
}

export async function deleteProductCategory(id: string) {
    await requireAdmin();

    // La relation parent/enfant n'a pas d'onDelete : sans ce contrôle, la
    // contrainte remonterait une erreur Prisma brute.
    const children = await prisma.productCategory.count({
        where: { parentId: id },
    });
    if (children > 0) {
        throw new Error(
            `Cette catégorie a ${children} sous-catégorie${children > 1 ? "s" : ""}. Supprimez-les ou déplacez-les d'abord.`,
        );
    }

    await prisma.productCategory.delete({ where: { id } });
    revalidate();
}

// ─── Catégories posts ─────────────────────────────────────────────────────────

export async function getPostCategories(): Promise<SerializedCategory[]> {
    await requireAdmin();
    const rows = await prisma.postCategory.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            seoTitle: true,
            seoDesc: true,
            _count: { select: { posts: true } },
        },
        orderBy: { name: "asc" },
    });

    return flattenTree(rows).map(({ _count, ...row }) => ({
        ...row,
        count: _count.posts,
    }));
}

export async function createPostCategory(input: CategoryInput) {
    await requireAdmin();
    await prisma.postCategory.create({
        data: {
            name: input.name,
            slug: uniqueSlug(input),
            description: input.description || null,
            parentId: input.parentId || null,
            seoTitle: input.seoTitle || null,
            seoDesc: input.seoDesc || null,
        },
    });
    revalidate();
}

export async function updatePostCategory(id: string, input: CategoryInput) {
    await requireAdmin();
    await assertNoCycle("postCategory", id, input.parentId ?? null);

    await prisma.postCategory.update({
        where: { id },
        data: {
            name: input.name,
            slug: uniqueSlug(input),
            description: input.description || null,
            parentId: input.parentId || null,
            seoTitle: input.seoTitle || null,
            seoDesc: input.seoDesc || null,
        },
    });
    revalidate();
}

export async function deletePostCategory(id: string) {
    await requireAdmin();

    const children = await prisma.postCategory.count({ where: { parentId: id } });
    if (children > 0) {
        throw new Error(
            `Cette catégorie a ${children} sous-catégorie${children > 1 ? "s" : ""}. Supprimez-les ou déplacez-les d'abord.`,
        );
    }

    await prisma.postCategory.delete({ where: { id } });
    revalidate();
}

// ─── Tags produits ────────────────────────────────────────────────────────────

export async function getProductTags(): Promise<SerializedTag[]> {
    await requireAdmin();
    const rows = await prisma.productTag.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
    });
    return rows.map(({ _count, ...row }) => ({ ...row, count: _count.products }));
}

export async function createProductTag(input: { name: string; slug: string }) {
    await requireAdmin();
    await prisma.productTag.create({
        data: {
            name: input.name,
            slug: input.slug.trim()
                ? generateSlug(input.slug)
                : generateSlug(input.name),
        },
    });
    revalidate();
}

export async function updateProductTag(
    id: string,
    input: { name: string; slug: string },
) {
    await requireAdmin();
    await prisma.productTag.update({
        where: { id },
        data: {
            name: input.name,
            slug: input.slug.trim()
                ? generateSlug(input.slug)
                : generateSlug(input.name),
        },
    });
    revalidate();
}

export async function deleteProductTag(id: string) {
    await requireAdmin();
    await prisma.productTag.delete({ where: { id } });
    revalidate();
}

// ─── Tags posts ───────────────────────────────────────────────────────────────

export async function getPostTags(): Promise<SerializedTag[]> {
    await requireAdmin();
    const rows = await prisma.postTag.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { posts: true } },
        },
        orderBy: { name: "asc" },
    });
    return rows.map(({ _count, ...row }) => ({ ...row, count: _count.posts }));
}

export async function createPostTag(input: { name: string; slug: string }) {
    await requireAdmin();
    await prisma.postTag.create({
        data: {
            name: input.name,
            slug: input.slug.trim()
                ? generateSlug(input.slug)
                : generateSlug(input.name),
        },
    });
    revalidate();
}

export async function updatePostTag(
    id: string,
    input: { name: string; slug: string },
) {
    await requireAdmin();
    await prisma.postTag.update({
        where: { id },
        data: {
            name: input.name,
            slug: input.slug.trim()
                ? generateSlug(input.slug)
                : generateSlug(input.name),
        },
    });
    revalidate();
}

export async function deletePostTag(id: string) {
    await requireAdmin();
    await prisma.postTag.delete({ where: { id } });
    revalidate();
}
