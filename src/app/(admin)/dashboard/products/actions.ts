"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ProductStatus, ProductCondition } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingMap, type ProductRating } from "@/lib/ratings";

// ─── Garde ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
    return session;
}

function revalidate(slug?: string) {
    revalidatePath("/dashboard/products");
    revalidatePath("/shop");
    if (slug) revalidatePath(`/product/${slug}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariantInput {
    name: string;
    value: string;
    stock: number;
    price?: number | null;
}

export interface ProductInput {
    name: string;
    slug: string;
    description?: string;
    images: string[];
    price: number;
    promoPrice?: number | null;
    stock: number;
    lowStockThreshold: number;
    weight?: number | null;
    sku?: string;
    mpn?: string;
    gtin?: string;
    condition: ProductCondition;
    googleProductCategory?: string;
    status: ProductStatus;
    seoTitle?: string;
    seoDescription?: string;
    categoryIds: string[];
    tagIds: string[];
    variants: ProductVariantInput[];
}

export interface ProductRow {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    price: number;
    promoPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    status: ProductStatus;
    categories: { id: string; name: string }[];
    /** Moyenne des avis approuvés ; null si aucun. */
    rating: ProductRating | null;
    updatedAt: Date;
}

export interface SerializedProduct extends ProductInput {
    id: string;
}

/** `null` sur un champ optionnel vide, pour ne pas écrire de chaîne vide en base. */
function orNull(value: string | undefined) {
    return value?.trim() ? value.trim() : null;
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getProducts(filters: {
    status?: ProductStatus;
    categoryId?: string;
    stock?: "IN_STOCK" | "LOW" | "OUT";
}): Promise<ProductRow[]> {
    await requireAdmin();

    const rows = await prisma.product.findMany({
        where: {
            ...(filters.status && { status: filters.status }),
            ...(filters.categoryId && {
                categories: { some: { categoryId: filters.categoryId } },
            }),
            ...(filters.stock === "OUT" && { stock: { lte: 0 } }),
            ...(filters.stock === "IN_STOCK" && { stock: { gt: 0 } }),
        },
        include: {
            categories: {
                include: { category: { select: { id: true, name: true } } },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
    });

    const ratings = await getRatingMap(rows.map((p) => p.id));

    const mapped: ProductRow[] = rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0] ?? null,
        // Decimal n'est pas sérialisable vers un Client Component.
        price: Number(p.price),
        promoPrice: p.promoPrice === null ? null : Number(p.promoPrice),
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
        categories: p.categories.map((c) => c.category),
        rating: ratings.get(p.id) ?? null,
        updatedAt: p.updatedAt,
    }));

    // « Stock faible » dépend d'un seuil propre à chaque produit : Prisma ne sait
    // pas comparer deux colonnes ici, le filtrage se fait après lecture.
    if (filters.stock === "LOW") {
        return mapped.filter(
            (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
        );
    }
    return mapped;
}

export async function getProduct(id: string): Promise<SerializedProduct | null> {
    await requireAdmin();

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            categories: { select: { categoryId: true } },
            tags: { select: { tagId: true } },
            variants: {
                select: { name: true, value: true, stock: true, price: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    if (!product) return null;

    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description ?? "",
        images: product.images,
        price: Number(product.price),
        promoPrice:
            product.promoPrice === null ? null : Number(product.promoPrice),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        weight: product.weight === null ? null : Number(product.weight),
        sku: product.sku ?? "",
        mpn: product.mpn ?? "",
        gtin: product.gtin ?? "",
        condition: product.condition,
        googleProductCategory: product.googleProductCategory ?? "",
        status: product.status,
        seoTitle: product.seoTitle ?? "",
        seoDescription: product.seoDescription ?? "",
        categoryIds: product.categories.map((c) => c.categoryId),
        tagIds: product.tags.map((t) => t.tagId),
        variants: product.variants.map((v) => ({
            name: v.name,
            value: v.value,
            stock: v.stock,
            price: v.price === null ? null : Number(v.price),
        })),
    };
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

function toData(input: ProductInput) {
    return {
        name: input.name,
        slug: input.slug,
        description: orNull(input.description),
        images: input.images,
        price: input.price,
        promoPrice: input.promoPrice ?? null,
        stock: input.stock,
        lowStockThreshold: input.lowStockThreshold,
        weight: input.weight ?? null,
        sku: orNull(input.sku),
        mpn: orNull(input.mpn),
        gtin: orNull(input.gtin),
        condition: input.condition,
        googleProductCategory: orNull(input.googleProductCategory),
        status: input.status,
        seoTitle: orNull(input.seoTitle),
        seoDescription: orNull(input.seoDescription),
    };
}

export async function createProduct(input: ProductInput) {
    await requireAdmin();

    const product = await prisma.product.create({
        data: {
            ...toData(input),
            publishedAt: input.status === "PUBLISHED" ? new Date() : null,
            categories: {
                create: input.categoryIds.map((categoryId) => ({ categoryId })),
            },
            tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
            variants: {
                create: input.variants.map((v) => ({
                    name: v.name,
                    value: v.value,
                    stock: v.stock,
                    price: v.price ?? null,
                })),
            },
        },
    });

    revalidate(product.slug);
    return { id: product.id };
}

export async function updateProduct(id: string, input: ProductInput) {
    await requireAdmin();

    // Les relations sont remplacées en bloc, comme updatePost le fait pour les
    // catégories et tags d'un post.
    await prisma.productsOnCategories.deleteMany({ where: { productId: id } });
    await prisma.productsOnTags.deleteMany({ where: { productId: id } });
    await prisma.productVariant.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({
        where: { id },
        data: {
            ...toData(input),
            publishedAt: input.status === "PUBLISHED" ? new Date() : undefined,
            categories: {
                create: input.categoryIds.map((categoryId) => ({ categoryId })),
            },
            tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
            variants: {
                create: input.variants.map((v) => ({
                    name: v.name,
                    value: v.value,
                    stock: v.stock,
                    price: v.price ?? null,
                })),
            },
        },
    });

    revalidatePath(`/dashboard/products/${id}`);
    revalidate(product.slug);
}

export async function updateProductStatus(id: string, status: ProductStatus) {
    await requireAdmin();
    const product = await prisma.product.update({
        where: { id },
        data: {
            status,
            publishedAt: status === "PUBLISHED" ? new Date() : undefined,
        },
    });
    revalidate(product.slug);
}

export async function deleteProduct(id: string) {
    await requireAdmin();

    // OrderItem.product n'a pas d'onDelete : un produit déjà commandé ne peut pas
    // disparaître sans emporter l'historique de commande.
    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
        throw new Error(
            `Ce produit apparaît dans ${orderCount} ligne${orderCount > 1 ? "s" : ""} de commande. Passez-le en brouillon plutôt que de le supprimer.`,
        );
    }

    const product = await prisma.product.delete({ where: { id } });
    revalidate(product.slug);
}
