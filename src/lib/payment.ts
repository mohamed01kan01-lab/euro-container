import type { SiteSettings } from "@prisma/client";

/**
 * Order.paymentMethod reste un String en base : le passer en enum imposerait un
 * ALTER COLUMN risqué sur une colonne de production. Les valeurs autorisées sont
 * donc tenues ici, et validées à l'écriture.
 */
export const PAYMENT_METHODS = [
    "CASH_ON_DELIVERY",
    "BANK_TRANSFER",
    "MOBILE_MONEY",
    "STRIPE",
    "FEEXPAY",
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethodValue, string> = {
    CASH_ON_DELIVERY: "Paiement à la livraison",
    BANK_TRANSFER: "Virement bancaire",
    MOBILE_MONEY: "Transfert Mobile Money",
    STRIPE: "Carte bancaire",
    FEEXPAY: "Mobile Money (FeexPay)",
};

export const PAYMENT_HINTS: Record<PaymentMethodValue, string> = {
    CASH_ON_DELIVERY: "Vous payez en espèces à la réception.",
    BANK_TRANSFER: "Les coordonnées bancaires vous seront communiquées.",
    MOBILE_MONEY: "Le numéro de transfert vous sera communiqué.",
    STRIPE: "Paiement sécurisé par carte.",
    FEEXPAY: "Paiement mobile sécurisé.",
};

export function isPaymentMethod(value: string): value is PaymentMethodValue {
    return (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Un prestataire n'est proposé que si ses deux clés sont renseignées. */
export function isStripeConfigured(s: SiteSettings): boolean {
    return !!(s.stripePublicKey?.trim() && s.stripeSecretKey?.trim());
}

export function isFeexpayConfigured(s: SiteSettings): boolean {
    return !!(s.feexpayPublicKey?.trim() && s.feexpaySecretKey?.trim());
}

/**
 * Moyens de paiement offerts au client.
 *
 * Les moyens manuels activés sont toujours présents : configurer Stripe ou
 * FeexPay ajoute une option, ça n'en retire aucune. Si l'administrateur a tout
 * désactivé sans configurer de prestataire, on rétablit le paiement à la
 * livraison — un checkout sans issue serait pire que ce réglage forcé.
 */
export function availablePaymentMethods(
    s: SiteSettings,
): PaymentMethodValue[] {
    const methods: PaymentMethodValue[] = [];

    if (s.codEnabled) methods.push("CASH_ON_DELIVERY");
    if (s.bankTransferEnabled) methods.push("BANK_TRANSFER");
    if (s.mobileMoneyEnabled) methods.push("MOBILE_MONEY");
    if (isStripeConfigured(s)) methods.push("STRIPE");
    if (isFeexpayConfigured(s)) methods.push("FEEXPAY");

    return methods.length > 0 ? methods : ["CASH_ON_DELIVERY"];
}

/** Instructions à afficher après commande, selon le moyen choisi. */
export function paymentInstructions(
    method: string,
    s: SiteSettings,
): string | null {
    if (method === "BANK_TRANSFER") return s.bankTransferDetails;
    if (method === "MOBILE_MONEY") return s.mobileMoneyDetails;
    return null;
}
