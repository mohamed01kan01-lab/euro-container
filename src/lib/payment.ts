import type { SiteSettings } from "@prisma/client";

/**
 * Order.paymentMethod reste un String en base : le passer en enum imposerait un
 * ALTER COLUMN risqué sur une colonne de production. Les valeurs autorisées sont
 * donc tenues ici, et validées à l'écriture.
 *
 * Seuls la carte (Stripe) et le virement sont proposés au checkout. Les autres
 * valeurs ne subsistent que pour afficher correctement les anciennes commandes.
 */
export const PAYMENT_METHODS = [
    "STRIPE",
    "BANK_TRANSFER",
    "CASH_ON_DELIVERY",
    "MOBILE_MONEY",
    "FEEXPAY",
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** Moyens réellement proposables au checkout. */
export type CheckoutPaymentMethod = "STRIPE" | "BANK_TRANSFER";

export const PAYMENT_LABELS: Record<PaymentMethodValue, string> = {
    STRIPE: "Carte bancaire",
    BANK_TRANSFER: "Virement bancaire",
    CASH_ON_DELIVERY: "Paiement à la livraison",
    MOBILE_MONEY: "Transfert Mobile Money",
    FEEXPAY: "Mobile Money (FeexPay)",
};

export function isPaymentMethod(value: string): value is PaymentMethodValue {
    return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentLabel(method: string | null): string | null {
    if (!method) return null;
    return isPaymentMethod(method) ? PAYMENT_LABELS[method] : method;
}

/** Stripe n'est proposé que si ses deux clés sont renseignées. */
export function isStripeConfigured(s: SiteSettings): boolean {
    return !!(s.stripePublicKey?.trim() && s.stripeSecretKey?.trim());
}

/**
 * Le virement n'est proposé que s'il est activé ET qu'un IBAN et un titulaire
 * existent : proposer un virement sans RIB laisserait le client sans issue.
 */
export function isBankTransferConfigured(s: SiteSettings): boolean {
    return (
        s.bankTransferEnabled &&
        !!s.bankIban?.trim() &&
        !!s.bankAccountHolder?.trim()
    );
}

/** Carte en premier : c'est le moyen qui convertit le mieux. */
export function availablePaymentMethods(
    s: SiteSettings,
): CheckoutPaymentMethod[] {
    const methods: CheckoutPaymentMethod[] = [];
    if (isStripeConfigured(s)) methods.push("STRIPE");
    if (isBankTransferConfigured(s)) methods.push("BANK_TRANSFER");
    return methods;
}
