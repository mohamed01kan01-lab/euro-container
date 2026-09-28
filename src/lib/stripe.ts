import Stripe from "stripe";
import type { SiteSettings } from "@prisma/client";

const clients = new Map<string, Stripe>();

/** Client Stripe construit à partir de la clé stockée dans les réglages. */
export function getStripe(settings: SiteSettings): Stripe {
    const key = settings.stripeSecretKey?.trim();
    if (!key) throw new Error("Stripe n'est pas configuré.");
    let client = clients.get(key);
    if (!client) {
        client = new Stripe(key);
        clients.set(key, client);
    }
    return client;
}

export const APP_URL = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** URL publique de la page commande, préfixée par la locale si ce n'est pas le français. */
export function orderUrl(orderNumber: string, locale = "fr"): string {
    const prefix = locale === "fr" ? "" : `/${locale}`;
    return `${APP_URL}${prefix}/order/${orderNumber}`;
}

const toCents = (value: number) => Math.round(value * 100);

interface SessionOrder {
    id: string;
    orderNumber: string;
    customerEmail: string;
    currency: string;
    total: number;
    discount: number;
    shippingCost: number;
    taxRate: number;
    taxAmount: number;
    items: { name: string; price: number; quantity: number }[];
}

/**
 * Session Stripe Checkout (page de paiement hébergée par Stripe).
 *
 * Les lignes sont détaillées pour que le client reconnaisse sa commande. Stripe
 * n'acceptant pas de ligne négative, une commande remisée est présentée en une
 * seule ligne au montant exact : le total débité est toujours `order.total`.
 */
export async function createCheckoutSession(
    settings: SiteSettings,
    order: SessionOrder,
    locale: string,
): Promise<Stripe.Checkout.Session> {
    const stripe = getStripe(settings);
    const currency = order.currency.toLowerCase();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        order.discount > 0
            ? [
                  {
                      quantity: 1,
                      price_data: {
                          currency,
                          unit_amount: toCents(order.total),
                          product_data: {
                              name: `Commande ${order.orderNumber}`,
                              description: order.items
                                  .map((i) => `${i.quantity} × ${i.name}`)
                                  .join(", ")
                                  .slice(0, 500),
                          },
                      },
                  },
              ]
            : [
                  ...order.items.map((item) => ({
                      quantity: item.quantity,
                      price_data: {
                          currency,
                          unit_amount: toCents(item.price),
                          product_data: { name: item.name },
                      },
                  })),
                  ...(order.shippingCost > 0
                      ? [
                            {
                                quantity: 1,
                                price_data: {
                                    currency,
                                    unit_amount: toCents(order.shippingCost),
                                    product_data: { name: "Livraison" },
                                },
                            },
                        ]
                      : []),
                  // Lignes HT + une ligne TVA : leur somme vaut exactement order.total (TTC).
                  ...(order.taxAmount > 0
                      ? [
                            {
                                quantity: 1,
                                price_data: {
                                    currency,
                                    unit_amount: toCents(order.taxAmount),
                                    product_data: { name: `TVA ${order.taxRate} %` },
                                },
                            },
                        ]
                      : []),
              ];

    const url = orderUrl(order.orderNumber, locale);

    return stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: order.customerEmail,
        client_reference_id: order.id,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        payment_intent_data: {
            metadata: { orderId: order.id, orderNumber: order.orderNumber },
        },
        locale: locale === "en" ? "en" : "fr",
        success_url: `${url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${url}?payment=cancelled`,
    });
}
