import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupon";

export const CART_COOKIE = "np_cart";

const MAX_LINES = 50;
const MAX_QTY = 99;

/** Forme stockée en cookie : identifiants et quantités, rien de monétaire. */
interface StoredItem {
    p: string; // productId
    v: string | null; // variantId
    q: number; // quantité
}

interface StoredCart {
    items: StoredItem[];
    coupon?: string;
}

export interface CartLine {
    key: string;
    productId: string;
    variantId: string | null;
    slug: string;
    name: string;
    variantLabel: string | null;
    image: string | null;
    unitPrice: number;
    quantity: number;
    /** Stock disponible pour cette ligne (variante si choisie). */
    stock: number;
    lineTotal: number;
    categoryIds: string[];
}

export interface Cart {
    lines: CartLine[];
    itemCount: number;
    subtotal: number;
    couponCode: string | null;
    discount: number;
    freeShipping: boolean;
    /** Motif si le coupon mémorisé n'est plus applicable. */
    couponError: string | null;
}

export function lineKey(productId: string, variantId: string | null) {
    return variantId ? `${productId}:${variantId}` : productId;
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

export async function readStoredCart(): Promise<StoredCart> {
    const raw = (await cookies()).get(CART_COOKIE)?.value;
    if (!raw) return { items: [] };

    try {
        const parsed = JSON.parse(raw) as StoredCart;
        if (!Array.isArray(parsed.items)) return { items: [] };

        return {
            items: parsed.items
                .filter(
                    (i) =>
                        typeof i?.p === "string" &&
                        Number.isInteger(i.q) &&
                        i.q > 0,
                )
                .slice(0, MAX_LINES)
                .map((i) => ({
                    p: i.p,
                    v: typeof i.v === "string" ? i.v : null,
                    q: Math.min(i.q, MAX_QTY),
                })),
            coupon:
                typeof parsed.coupon === "string" ? parsed.coupon : undefined,
        };
    } catch {
        // Cookie corrompu ou forgé : on repart d'un panier vide plutôt que de
        // faire échouer toutes les pages qui le lisent.
        return { items: [] };
    }
}

/**
 * À n'appeler que depuis une Server Action ou un Route Handler : Next interdit
 * l'écriture de cookies pendant le rendu.
 */
export async function writeStoredCart(cart: StoredCart) {
    const store = await cookies();
    if (cart.items.length === 0 && !cart.coupon) {
        store.delete(CART_COOKIE);
        return;
    }
    store.set(CART_COOKIE, JSON.stringify(cart), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}

// ─── Hydratation ──────────────────────────────────────────────────────────────

/**
 * Reconstruit le panier depuis la base à chaque lecture : prix, stock et
 * disponibilité viennent toujours de la source de vérité, jamais du cookie.
 * Les quantités sont ramenées au stock en mémoire — l'écriture du cookie
 * corrigé se fera à la prochaine action de l'utilisateur.
 */
export async function getCart(): Promise<Cart> {
    const stored = await readStoredCart();
    if (stored.items.length === 0) {
        return {
            lines: [],
            itemCount: 0,
            subtotal: 0,
            couponCode: stored.coupon ?? null,
            discount: 0,
            freeShipping: false,
            couponError: null,
        };
    }

    const products = await prisma.product.findMany({
        where: {
            id: { in: stored.items.map((i) => i.p) },
            status: "PUBLISHED",
        },
        include: {
            variants: {
                select: { id: true, name: true, value: true, stock: true, price: true },
            },
            categories: { select: { categoryId: true } },
        },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: CartLine[] = [];
    for (const item of stored.items) {
        const product = byId.get(item.p);
        // Produit supprimé ou dépublié : la ligne disparaît en silence.
        if (!product) continue;

        const variant = item.v
            ? (product.variants.find((v) => v.id === item.v) ?? null)
            : null;
        // Variante supprimée entre-temps : la ligne n'est plus valide.
        if (item.v && !variant) continue;

        const basePrice =
            product.promoPrice !== null
                ? Number(product.promoPrice)
                : Number(product.price);
        const unitPrice =
            variant?.price != null ? Number(variant.price) : basePrice;

        const stock = variant ? variant.stock : product.stock;
        if (stock <= 0) continue;

        const quantity = Math.min(item.q, stock);

        lines.push({
            key: lineKey(product.id, variant?.id ?? null),
            productId: product.id,
            variantId: variant?.id ?? null,
            slug: product.slug,
            name: product.name,
            variantLabel: variant ? `${variant.name} : ${variant.value}` : null,
            image: product.images[0] ?? null,
            unitPrice,
            quantity,
            stock,
            lineTotal: Math.round(unitPrice * quantity * 100) / 100,
            categoryIds: product.categories.map((c) => c.categoryId),
        });
    }

    const subtotal =
        Math.round(lines.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

    let discount = 0;
    let freeShipping = false;
    let couponError: string | null = null;

    if (stored.coupon && lines.length > 0) {
        try {
            const result = await validateCoupon(
                stored.coupon,
                subtotal,
                lines.map((l) => l.productId),
                [...new Set(lines.flatMap((l) => l.categoryIds))],
            );
            discount = result.discount;
            freeShipping = result.freeShipping;
        } catch (err) {
            // Le coupon reste mémorisé mais n'est pas appliqué : on explique
            // pourquoi au lieu de l'effacer sans rien dire.
            couponError =
                err instanceof Error ? err.message : "Code promo invalide.";
        }
    }

    return {
        lines,
        itemCount,
        subtotal,
        couponCode: stored.coupon ?? null,
        discount,
        freeShipping,
        couponError,
    };
}

/** Nombre d'articles, pour le badge de l'en-tête. */
export async function getCartCount(): Promise<number> {
    const stored = await readStoredCart();
    return stored.items.reduce((sum, i) => sum + i.q, 0);
}

export { MAX_QTY, MAX_LINES };
