import { randomInt } from "node:crypto";

// Sans 0/O, 1/I/L : la référence est recopiée à la main dans un virement.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Référence de commande, ex. EC-7K2N9PQ4. Elle sert aussi de libellé de virement
 * et donne accès à la page de commande : 8 caractères (31^8 ≈ 850 milliards de
 * combinaisons) la rendent impossible à deviner par énumération.
 */
export function generateOrderReference(): string {
    let ref = "";
    for (let i = 0; i < 8; i++) ref += ALPHABET[randomInt(ALPHABET.length)];
    return `EC-${ref}`;
}
