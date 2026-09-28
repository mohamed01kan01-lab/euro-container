import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Coordonnées de paiement et informations légales FICTIVES, en attendant les vraies.
 * L'IBAN est l'exemple officiel français : clé mod-97 valide, aucun compte réel.
 * Les clés Stripe ne sont pas touchées (elles viennent du compte Stripe de test).
 *
 * Usage : pnpm tsx scripts/seed-payment-settings.ts
 */
const ID = "singleton";

async function main() {
    const data = {
        currency: "EUR",
        phone: "+33 1 23 45 67 89",
        bankTransferEnabled: true,
        bankAccountHolder: "Euro Container Market SAS",
        bankHolderAddress: "12 rue des Docks\n76600 Le Havre, France",
        bankIban: "FR7630006000011234567890189",
        bankBic: "EUCMFRPPXXX",
        bankName: "Banque Fictive du Port",
        bankAddress: "1 quai de l'Europe\n76600 Le Havre, France",
        paymentDueDays: 7,
        bankTransferDetails:
            "Les virements SEPA arrivent généralement sous 1 à 2 jours ouvrés. Pensez à indiquer la référence de commande.",
        // Informations légales FICTIVES (SIRET et TVA inventés).
        vatRate: 20,
        legalName: "Euro Container Market",
        legalForm: "SAS",
        legalCapital: "10 000 €",
        legalSiret: "000 000 000 00000",
        legalRcs: "RCS Le Havre",
        legalVatNumber: "FR00000000000",
        legalAddress: "12 rue des Docks, 76600 Le Havre, France",
        publicationDirector: "Prénom Nom (fictif)",
        hostInfo: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
        mediatorName: "Médiateur fictif à renseigner",
        mediatorUrl: "https://www.economie.gouv.fr/mediation-conso",
    };

    const settings = await prisma.siteSettings.upsert({
        where: { id: ID },
        create: { id: ID, ...data },
        update: data,
    });

    console.log("Coordonnées de paiement fictives enregistrées :", {
        titulaire: settings.bankAccountHolder,
        iban: settings.bankIban,
        bic: settings.bankBic,
        devise: settings.currency,
    });
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
