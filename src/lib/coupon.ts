import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CouponResult {
    coupon: Coupon;
    /** Remise sur les articles, en devise. Zéro pour la livraison offerte. */
    discount: number;
    freeShipping: boolean;
}

/**
 * Valide un code et calcule la remise.
 *
 * Appelée au panier pour l'affichage **et** à la création de commande : le
 * montant calculé côté panier ne fait jamais foi, un coupon peut expirer ou
 * atteindre sa limite entre les deux.
 */
export async function validateCoupon(
    code: string,
    subtotal: number,
    productIds: string[],
    categoryIds: string[],
): Promise<CouponResult> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new Error("Saisissez un code promo.");

    const coupon = await prisma.coupon.findUnique({
        where: { code: normalized },
    });
    if (!coupon) throw new Error("Ce code promo n'existe pas.");
    if (!coupon.isActive) throw new Error("Ce code promo n'est plus actif.");

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
        throw new Error("Ce code promo n'est pas encore valable.");
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
        throw new Error("Ce code promo a expiré.");
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new Error("Ce code promo a atteint sa limite d'utilisation.");
    }

    const minAmount = coupon.minAmount === null ? null : Number(coupon.minAmount);
    if (minAmount !== null && subtotal < minAmount) {
        throw new Error(
            `Ce code exige un minimum de ${minAmount} sur la commande.`,
        );
    }

    // Restrictions : le panier doit contenir au moins un produit éligible.
    if (coupon.productIds.length > 0) {
        const eligible = productIds.some((id) => coupon.productIds.includes(id));
        if (!eligible) {
            throw new Error(
                "Ce code ne s'applique à aucun produit de votre panier.",
            );
        }
    }
    if (coupon.categoryIds.length > 0) {
        const eligible = categoryIds.some((id) =>
            coupon.categoryIds.includes(id),
        );
        if (!eligible) {
            throw new Error(
                "Ce code ne s'applique à aucune catégorie de votre panier.",
            );
        }
    }

    if (coupon.type === "FREE_SHIPPING") {
        return { coupon, discount: 0, freeShipping: true };
    }

    const value = Number(coupon.value);
    const discount =
        coupon.type === "PERCENTAGE" ? (subtotal * value) / 100 : value;

    // Une remise ne peut pas dépasser le sous-total : sinon le total passerait
    // en négatif et la commande deviendrait un remboursement.
    return {
        coupon,
        discount: Math.min(Math.round(discount * 100) / 100, subtotal),
        freeShipping: false,
    };
}
