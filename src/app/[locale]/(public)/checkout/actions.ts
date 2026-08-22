"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCart, writeStoredCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { availablePaymentMethods, isPaymentMethod } from "@/lib/payment";

const schema = z.object({
    customerName: z.string().min(2, { message: "Votre nom est requis" }).trim(),
    customerEmail: z.email({ error: "Email invalide" }),
    customerPhone: z.string().trim().optional(),
    shippingMethod: z.enum(["DELIVERY", "PICKUP"]),
    shippingZoneId: z.string().optional(),
    pickupPointId: z.string().optional(),
    addressLine1: z.string().trim().optional(),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
    paymentMethod: z.string(),
    notes: z.string().trim().optional(),
});

export type CheckoutInput = z.infer<typeof schema>;

/**
 * Crée la commande.
 *
 * Rien de ce que le client envoie n'est utilisé pour l'argent : prix, stock,
 * remise et frais de port sont relus en base et recalculés ici. Le client ne
 * choisit que des identifiants.
 */
export async function placeOrder(
    input: CheckoutInput,
): Promise<{ orderNumber: string }> {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
    }
    const data = parsed.data;

    const [cart, settings, session] = await Promise.all([
        getCart(),
        getSiteSettings(),
        auth.api.getSession({ headers: await headers() }),
    ]);

    if (cart.lines.length === 0) {
        throw new Error("Votre panier est vide.");
    }

    // ─── Paiement ─────────────────────────────────────────────────────────────
    const allowed = availablePaymentMethods(settings);
    if (
        !isPaymentMethod(data.paymentMethod) ||
        !allowed.includes(data.paymentMethod)
    ) {
        throw new Error("Ce moyen de paiement n'est pas disponible.");
    }
    if (data.paymentMethod === "STRIPE" || data.paymentMethod === "FEEXPAY") {
        throw new Error(
            "Le paiement en ligne n'est pas encore actif. Choisissez un autre moyen de paiement.",
        );
    }

    // ─── Livraison ────────────────────────────────────────────────────────────
    let shippingCost = 0;
    let shippingZoneId: string | null = null;
    let pickupPointId: string | null = null;
    let addressJson: Record<string, string> = {};

    if (data.shippingMethod === "PICKUP") {
        if (!data.pickupPointId) {
            throw new Error("Choisissez un point de retrait.");
        }
        const point = await prisma.pickupPoint.findUnique({
            where: { id: data.pickupPointId },
            select: { id: true, isActive: true, name: true, address: true },
        });
        if (!point || !point.isActive) {
            throw new Error("Ce point de retrait n'est plus disponible.");
        }
        pickupPointId = point.id;
        addressJson = { pickup: point.name, line1: point.address };
    } else {
        if (!data.shippingZoneId) {
            throw new Error("Choisissez un secteur de livraison.");
        }
        const zone = await prisma.shippingZone.findUnique({
            where: { id: data.shippingZoneId },
            select: {
                id: true,
                isActive: true,
                price: true,
                freeAbove: true,
                name: true,
            },
        });
        if (!zone || !zone.isActive) {
            throw new Error("Ce secteur de livraison n'est plus disponible.");
        }
        if (!data.addressLine1 || !data.city) {
            throw new Error("Adresse et ville sont requises pour la livraison.");
        }

        const freeAbove = zone.freeAbove === null ? null : Number(zone.freeAbove);
        // Le seuil de gratuité s'apprécie sur le sous-total après remise.
        const afterDiscount = cart.subtotal - cart.discount;
        shippingCost =
            freeAbove !== null && afterDiscount >= freeAbove
                ? 0
                : Number(zone.price);

        shippingZoneId = zone.id;
        addressJson = {
            zone: zone.name,
            line1: data.addressLine1,
            ...(data.addressLine2 && { line2: data.addressLine2 }),
            city: data.city,
            ...(data.postalCode && { postalCode: data.postalCode }),
            ...(data.country && { country: data.country }),
        };
    }

    // ─── Coupon : revalidé, jamais repris du panier ───────────────────────────
    let couponId: string | null = null;
    let discount = 0;
    if (cart.couponCode) {
        try {
            const result = await validateCoupon(
                cart.couponCode,
                cart.subtotal,
                cart.lines.map((l) => l.productId),
                [...new Set(cart.lines.flatMap((l) => l.categoryIds))],
            );
            couponId = result.coupon.id;
            discount = result.discount;
            if (result.freeShipping) shippingCost = 0;
        } catch (err) {
            throw new Error(
                err instanceof Error
                    ? `Code promo : ${err.message}`
                    : "Code promo invalide.",
            );
        }
    }

    const subtotal = cart.subtotal;
    const total = Math.max(0, subtotal - discount) + shippingCost;

    // ─── Écriture atomique ────────────────────────────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
        // Le stock est revérifié dans la transaction : entre l'affichage du
        // panier et la validation, une autre commande a pu vider le stock.
        // On décrémente la variante ou le produit, jamais les deux — c'est la
        // même source que celle utilisée pour juger la disponibilité.
        for (const line of cart.lines) {
            if (line.variantId) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: line.variantId },
                    select: { stock: true },
                });
                if (!variant || variant.stock < line.quantity) {
                    throw new Error(
                        `Stock insuffisant pour « ${line.name} ». Ajustez votre panier.`,
                    );
                }
                await tx.productVariant.update({
                    where: { id: line.variantId },
                    data: { stock: { decrement: line.quantity } },
                });
            } else {
                const product = await tx.product.findUnique({
                    where: { id: line.productId },
                    select: { stock: true },
                });
                if (!product || product.stock < line.quantity) {
                    throw new Error(
                        `Stock insuffisant pour « ${line.name} ». Ajustez votre panier.`,
                    );
                }
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { decrement: line.quantity } },
                });
            }
        }

        if (couponId) {
            await tx.coupon.update({
                where: { id: couponId },
                data: { usedCount: { increment: 1 } },
            });
        }

        return tx.order.create({
            data: {
                userId: session?.user.id ?? null,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone || null,
                shippingAddress: addressJson,
                subtotal,
                shippingCost,
                discount,
                total,
                currency: settings.currency,
                paymentStatus: "PENDING",
                paymentMethod: data.paymentMethod,
                shippingStatus: "PENDING",
                shippingMethod: data.shippingMethod,
                shippingZoneId,
                pickupPointId,
                couponId,
                notes: data.notes || null,
                items: {
                    create: cart.lines.map((line) => ({
                        productId: line.productId,
                        variantId: line.variantId,
                        name: line.variantLabel
                            ? `${line.name} (${line.variantLabel})`
                            : line.name,
                        price: line.unitPrice,
                        quantity: line.quantity,
                    })),
                },
            },
            select: { orderNumber: true },
        });
    });

    await writeStoredCart({ items: [] });

    revalidatePath("/cart");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/orders");

    return { orderNumber: order.orderNumber };
}
