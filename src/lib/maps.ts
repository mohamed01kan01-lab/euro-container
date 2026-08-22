/**
 * URL d'intégration Google Maps construite à partir d'une adresse.
 *
 * Aucune URL n'est jamais stockée ni saisie : on la fabrique ici à partir de
 * l'adresse encodée. C'est ce qui rend l'`iframe` sûre — une URL libre fournie
 * par un administrateur permettrait de charger n'importe quel site dans la page.
 */
export function mapEmbedUrl(address: string): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Lien « ouvrir dans Google Maps », pour un usage hors iframe. */
export function mapLinkUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
