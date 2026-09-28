import type { SiteSettings } from "@prisma/client";

/**
 * Variables des textes légaux et de la FAQ (messages/*.json → legal, faq),
 * alimentées par Réglages → Informations légales. Une valeur manquante est
 * rendue par un marqueur visible (« [à compléter] ») plutôt que masquée : un
 * texte légal incomplet doit se voir.
 */
export type LegalVars = Record<string, string | null>;

export function legalVars(s: SiteSettings): LegalVars {
    return {
        siteName: s.siteName,
        company: s.legalName,
        legalForm: s.legalForm,
        capital: s.legalCapital,
        siret: s.legalSiret,
        rcs: s.legalRcs,
        vatNumber: s.legalVatNumber,
        address: s.legalAddress ?? s.address,
        email: s.contactEmail,
        phone: s.phone,
        director: s.publicationDirector,
        host: s.hostInfo,
        mediatorName: s.mediatorName,
        mediatorUrl: s.mediatorUrl,
        days: String(s.paymentDueDays),
        vat: String(s.vatRate),
    };
}

export function fillLegal(text: string, vars: LegalVars, todo: string): string {
    return text.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = vars[key];
        return value && value.trim() ? value : todo;
    });
}
