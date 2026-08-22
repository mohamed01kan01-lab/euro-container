/**
 * Formatage monétaire du dashboard. La devise vient de SiteSettings.currency
 * (XOF par défaut) — ne jamais la coder en dur côté composant.
 */
export function formatCurrency(value: number, currency: string): string {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

/** Variante avec décimales, pour les prix unitaires et les lignes de commande. */
export function formatPrice(value: number, currency: string): string {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
    }).format(value);
}
