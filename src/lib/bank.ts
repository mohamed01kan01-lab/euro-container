/**
 * Utilitaires bancaires sans dépendance serveur : utilisables dans le
 * navigateur (validation en direct) comme côté serveur.
 */

export function normalizeIban(value: string): string {
    return value.replace(/\s+/g, "").toUpperCase();
}

/** IBAN groupé par 4, tel qu'imprimé sur un RIB. */
export function formatIban(value: string): string {
    return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

/** Validation ISO 13616 : structure puis clé de contrôle mod-97. */
export function isValidIban(value: string): boolean {
    const iban = normalizeIban(value);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
        const digits = /\d/.test(char)
            ? char
            : String(char.charCodeAt(0) - 55);
        for (const d of digits) {
            remainder = (remainder * 10 + Number(d)) % 97;
        }
    }
    return remainder === 1;
}

export function normalizeBic(value: string): string {
    return value.replace(/\s+/g, "").toUpperCase();
}

/** BIC/SWIFT : 8 ou 11 caractères (banque, pays, localité, agence). */
export function isValidBic(value: string): boolean {
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalizeBic(value));
}

export interface BankDetails {
    accountHolder: string;
    holderAddress: string | null;
    iban: string;
    bic: string | null;
    bankName: string | null;
    bankAddress: string | null;
}

/**
 * Charge utile du QR code SEPA (EPC069-12, « GiroCode ») : scanné par une appli
 * bancaire européenne, il pré-remplit bénéficiaire, IBAN, montant et référence.
 * Le montant n'est encodé qu'en euros, seule devise acceptée par le standard.
 */
export function epcQrPayload({
    bank,
    amount,
    currency,
    reference,
}: {
    bank: BankDetails;
    amount: number;
    currency: string;
    reference: string;
}): string | null {
    if (currency !== "EUR" || amount <= 0 || amount > 999999999.99) return null;
    return [
        "BCD",
        "002",
        "1",
        "SCT",
        bank.bic ? normalizeBic(bank.bic) : "",
        bank.accountHolder.slice(0, 70),
        normalizeIban(bank.iban),
        `EUR${amount.toFixed(2)}`,
        "",
        "",
        reference.slice(0, 140),
    ].join("\n");
}
