"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupon";
import {
    getCart,
    readStoredCart,
    writeStoredCart,
    lineKey,
    MAX_QTY,
    MAX_LINES,
} from "@/lib/cart";

function revalidateCart() {
    revalidatePath("/cart");
    revalidatePath("/checkout");
    // L'en-tête public affiche le compteur d'articles sur toutes les pages.
    revalidatePath("/", "layout");
}

/**
 * Ajoute au panier après vérification en base : produit publié, variante
 * existante, stock suffisant. Le client ne fournit jamais de prix.
 */
export async function addToCart(input: {
    productId: string;
    variantId?: string | null;
    quantity?: number;
}) {
    const quantity = Math.max(1, Math.min(input.quantity ?? 1, MAX_QTY));

    const product = await prisma.product.findUnique({
        where: { id: input.productId },
        select: {
            id: true,
            status: true,
            stock: true,
            variants: { select: { id: true, stock: true } },
        },
    });
    if (!product || product.status !== "PUBLISHED") {
        throw new Error("Ce produit n'est plus disponible.");
    }

    let variantId: string | null = null;
    let stock = product.stock;

    if (input.variantId) {
        const variant = product.variants.find((v) => v.id === input.variantId);
        if (!variant) throw new Error("Cette variante n'existe plus.");
        variantId = variant.id;
        stock = variant.stock;
    } else if (product.variants.length > 0) {
        throw new Error("Choisissez une option avant d'ajouter au panier.");
    }

    if (stock <= 0) throw new Error("Ce produit est en rupture de stock.");

    const stored = await readStoredCart();
    const key = lineKey(product.id, variantId);
    const existing = stored.items.find(
        (i) => lineKey(i.p, i.v) === key,
    );

    if (existing) {
        existing.q = Math.min(existing.q + quantity, stock, MAX_QTY);
    } else {
        if (stored.items.length >= MAX_LINES) {
            throw new Error("Votre panier contient trop d'articles différents.");
        }
        stored.items.push({
            p: product.id,
            v: variantId,
            q: Math.min(quantity, stock),
        });
    }

    await writeStoredCart(stored);
    revalidateCart();
}

export async function updateQuantity(
    productId: string,
    variantId: string | null,
    quantity: number,
) {
    const stored = await readStoredCart();
    const key = lineKey(productId, variantId);

    if (quantity <= 0) {
        stored.items = stored.items.filter((i) => lineKey(i.p, i.v) !== key);
    } else {
        const item = stored.items.find((i) => lineKey(i.p, i.v) === key);
        if (!item) throw new Error("Cet article n'est plus dans votre panier.");

        // Le plafond vient de la base, pas du client.
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                stock: true,
                variants: { select: { id: true, stock: true } },
            },
        });
        if (!product) throw new Error("Ce produit n'est plus disponible.");

        const stock = variantId
            ? (product.variants.find((v) => v.id === variantId)?.stock ?? 0)
            : product.stock;
        if (stock <= 0) throw new Error("Ce produit est en rupture de stock.");

        item.q = Math.min(quantity, stock, MAX_QTY);
    }

    await writeStoredCart(stored);
    revalidateCart();
}

export async function removeFromCart(
    productId: string,
    variantId: string | null,
) {
    const stored = await readStoredCart();
    const key = lineKey(productId, variantId);
    stored.items = stored.items.filter((i) => lineKey(i.p, i.v) !== key);
    await writeStoredCart(stored);
    revalidateCart();
}

export async function clearCart() {
    await writeStoredCart({ items: [] });
    revalidateCart();
}

export async function applyCoupon(code: string) {
    const cart = await getCart();
    if (cart.lines.length === 0) {
        throw new Error("Votre panier est vide.");
    }

    // Validation immédiate : inutile de mémoriser un code qu'on sait refusé.
    await validateCoupon(
        code,
        cart.subtotal,
        cart.lines.map((l) => l.productId),
        [...new Set(cart.lines.flatMap((l) => l.categoryIds))],
    );

    const stored = await readStoredCart();
    stored.coupon = code.trim().toUpperCase();
    await writeStoredCart(stored);
    revalidateCart();
}

export async function removeCoupon() {
    const stored = await readStoredCart();
    delete stored.coupon;
    await writeStoredCart(stored);
    revalidateCart();
}
