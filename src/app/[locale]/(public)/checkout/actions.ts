"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCart, writeStoredCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { availablePaymentMethods } from "@/lib/payment";
import { generateOrderReference } from "@/lib/order-reference";
import { taxOf } from "@/lib/tax";
import { defer, startCardPayment } from "@/lib/order-payment";
import {
    notifyAdmin,
    sendOrderReceivedEmail,
    sendOrderReservedEmail,
} from "@/lib/order-emails";

const schema = z.object({
    checkoutKey: z.uuid(),
    locale: z.string().max(5).default("fr"),
    customerName: z.string().trim().min(2, { message: "Votre nom est requis" }),
    customerEmail: z.email({ error: "Email invalide" }),
    customerPhone: z.string().trim().min(6, { message: "Un téléphone est requis pour organiser la livraison" }),
    company: z.string().trim().max(120).optional(),
    vatNumber: z
        .string()
        .trim()
        .max(20)
        .refine((v) => !v || /^[A-Z]{2}[A-Z0-9]{2,13}$/i.test(v.replace(/\s+/g, "")), {
            message: "Numéro de TVA intracommunautaire invalide (ex. FR12345678901)",
        })
        .optional(),
    shippingMethod: z.enum(["DELIVERY", "PICKUP"]),
    shippingZoneId: z.string().optional(),
    pickupPointId: z.string().optional(),
    addressLine1: z.string().trim().optional(),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
    paymentMethod: z.enum(["STRIPE", "BANK_TRANSFER"]),
    notes: z.string().trim().max(1000).optional(),
});

export type CheckoutInput = z.input<typeof schema>;

export type PlaceOrderResult =
    | {
          ok: true;
          orderNumber: string;
          /** Page Stripe vers laquelle rediriger (paiement par carte). */
          redirectUrl?: string;
      }
    | { ok: false; error: string };

class CheckoutError extends Error {}

/**
 * Crée la commande.
 *
 * Rien de ce que le client envoie n'est utilisé pour l'argent : prix, stock,
 * remise et frais de port sont relus en base et recalculés ici.
 *
 * Idempotent : `checkoutKey` est généré une fois par le navigateur. Un double
 * clic, un rafraîchissement ou un retour arrière depuis Stripe renvoie la
 * commande déjà créée au lieu d'en créer une seconde.
 */
export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
    }
    const data = parsed.data;

    try {
        const existing = await prisma.order.findUnique({
            where: { checkoutKey: data.checkoutKey },
            select: { id: true, orderNumber: true, paymentMethod: true, paymentStatus: true },
        });
        if (existing) return resume(existing, data.locale);

        const order = await createOrder(data);

        await writeStoredCart({ items: [] });
        revalidatePath("/", "layout");
        revalidatePath("/dashboard/orders");

        if (data.paymentMethod === "BANK_TRANSFER") {
            defer("email commande reçue", () => sendOrderReceivedEmail(order.id));
            defer("notif admin commande", () => notifyAdmin(order.id, "NEW_ORDER"));
            return { ok: true, orderNumber: order.orderNumber };
        }

        // Carte : si le client ferme l'onglet Stripe, cet email est son seul
        // chemin de retour vers la commande.
        defer("email commande enregistrée", () => sendOrderReservedEmail(order.id));
        return resume(
            { ...order, paymentMethod: "STRIPE", paymentStatus: "PENDING" },
            data.locale,
        );
    } catch (err) {
        if (err instanceof CheckoutError) return { ok: false, error: err.message };
        // Deux envois simultanés avec la même clé : le second retombe sur la commande du premier.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            const existing = await prisma.order.findUnique({
                where: { checkoutKey: data.checkoutKey },
                select: { id: true, orderNumber: true, paymentMethod: true, paymentStatus: true },
            });
            if (existing) return resume(existing, data.locale);
        }
        console.error("[checkout] placeOrder :", err);
        return { ok: false, error: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." };
    }
}

/**
 * Suite d'une commande existante. Pour la carte, on renvoie vers Stripe ; si
 * Stripe est indisponible, la commande reste valable et sa page propose de
 * réessayer ou de payer par virement : le client n'est jamais bloqué.
 */
async function resume(
    order: { id: string; orderNumber: string; paymentMethod: string | null; paymentStatus: string },
    locale: string,
): Promise<PlaceOrderResult> {
    if (order.paymentMethod !== "STRIPE" || order.paymentStatus !== "PENDING") {
        return { ok: true, orderNumber: order.orderNumber };
    }
    try {
        const redirectUrl = await startCardPayment(order.id, locale);
        return { ok: true, orderNumber: order.orderNumber, redirectUrl };
    } catch (err) {
        console.error("[checkout] Stripe :", err);
        return { ok: true, orderNumber: order.orderNumber };
    }
}

async function createOrder(data: z.output<typeof schema>) {
    const [cart, settings, session] = await Promise.all([
        getCart(),
        getSiteSettings(),
        auth.api.getSession({ headers: await headers() }),
    ]);

    if (cart.lines.length === 0) {
        throw new CheckoutError("Votre panier est vide.");
    }
    if (!availablePaymentMethods(settings).includes(data.paymentMethod)) {
        throw new CheckoutError("Ce moyen de paiement n'est pas disponible.");
    }

    // ─── Livraison ────────────────────────────────────────────────────────────
    let shippingCost = 0;
    let shippingZoneId: string | null = null;
    let pickupPointId: string | null = null;
    let addressJson: Record<string, string> = {};

    if (data.shippingMethod === "PICKUP") {
        if (!data.pickupPointId) throw new CheckoutError("Choisissez un point de retrait.");
        const point = await prisma.pickupPoint.findUnique({
            where: { id: data.pickupPointId },
            select: { id: true, isActive: true, name: true, address: true },
        });
        if (!point || !point.isActive) {
            throw new CheckoutError("Ce point de retrait n'est plus disponible.");
        }
        pickupPointId = point.id;
        addressJson = { pickup: point.name, line1: point.address };
    } else {
        if (!data.shippingZoneId) throw new CheckoutError("Choisissez un secteur de livraison.");
        const zone = await prisma.shippingZone.findUnique({
            where: { id: data.shippingZoneId },
            select: { id: true, isActive: true, price: true, freeAbove: true, name: true },
        });
        if (!zone || !zone.isActive) {
            throw new CheckoutError("Ce secteur de livraison n'est plus disponible.");
        }
        if (!data.addressLine1 || !data.city) {
            throw new CheckoutError("Adresse et ville sont requises pour la livraison.");
        }

        const freeAbove = zone.freeAbove === null ? null : Number(zone.freeAbove);
        // Le seuil de gratuité s'apprécie sur le sous-total après remise.
        const afterDiscount = cart.subtotal - cart.discount;
        shippingCost =
            freeAbove !== null && afterDiscount >= freeAbove ? 0 : Number(zone.price);

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
    if (data.company) addressJson.company = data.company;
    if (data.company && data.vatNumber) addressJson.vatNumber = data.vatNumber.replace(/\s+/g, "").toUpperCase();

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
            throw new CheckoutError(
                err instanceof Error ? `Code promo : ${err.message}` : "Code promo invalide.",
            );
        }
    }

    // Tous les montants sont HT ; la TVA porte sur le total HT (articles
    // remisés + livraison) et le client paie le TTC.
    const subtotal = cart.subtotal;
    const totalHt = Math.max(0, subtotal - discount) + shippingCost;
    const taxRate = settings.vatRate;
    const taxAmount = taxOf(totalHt, taxRate);
    const total = Math.round((totalHt + taxAmount) * 100) / 100;
    // Même délai pour carte et virement : il borne la réservation du stock, les
    // relances et l'éventuelle annulation automatique.
    const paymentDueAt = new Date(Date.now() + settings.paymentDueDays * 24 * 60 * 60 * 1000);

    // ─── Écriture atomique ────────────────────────────────────────────────────
    return prisma.$transaction(async (tx) => {
        // Décrément conditionnel : si une autre commande a vidé le stock entre
        // l'affichage du panier et la validation, rien n'est écrit.
        for (const line of cart.lines) {
            const res = line.variantId
                ? await tx.productVariant.updateMany({
                      where: { id: line.variantId, stock: { gte: line.quantity } },
                      data: { stock: { decrement: line.quantity } },
                  })
                : await tx.product.updateMany({
                      where: { id: line.productId, stock: { gte: line.quantity } },
                      data: { stock: { decrement: line.quantity } },
                  });
            if (res.count === 0) {
                throw new CheckoutError(
                    `Stock insuffisant pour « ${line.name} ». Ajustez votre panier.`,
                );
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
                orderNumber: generateOrderReference(),
                checkoutKey: data.checkoutKey,
                userId: session?.user.id ?? null,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                shippingAddress: addressJson,
                subtotal,
                shippingCost,
                discount,
                taxRate,
                taxAmount,
                total,
                currency: settings.currency,
                paymentStatus: "PENDING",
                paymentMethod: data.paymentMethod,
                paymentDueAt,
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
            select: { id: true, orderNumber: true },
        });
    });
}
