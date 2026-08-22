import "dotenv/config";
import { prisma } from "@/lib/prisma";

const ID = "singleton";

async function main() {
    const data = {
        siteName: "Euro Container Market",
        slogan: "Des conteneurs qui correspondent à vos besoins",
        description:
            "Vente et location de conteneurs maritimes neufs et d'occasion : conteneurs standards, conteneurs modifiés (bureau, bar, piscine, logement), livraison partout en Europe.",
        contactEmail: "contact@eurocontainermarket.com",
        currency: "EUR",
        defaultLanguage: "fr",
    };

    const settings = await prisma.siteSettings.upsert({
        where: { id: ID },
        create: { id: ID, ...data },
        update: data,
    });

    console.log("SiteSettings mis à jour :", {
        siteName: settings.siteName,
        slogan: settings.slogan,
        currency: settings.currency,
    });
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
