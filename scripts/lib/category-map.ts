/**
 * Correspondance catégories scrapées (eurocontainermarket.com) → ProductCategory.
 * `sourceName` = nom exact renvoyé par l'API WooCommerce Store du site source
 * (wp-json/wc/store/v1/products/categories, vérifié le 2026-08-22) — c'est ce nom-là
 * que scrap-pro reporte tel quel dans `Product.categories`. `slug`/`name` sont ceux
 * utilisés côté Prisma (name un peu plus lisible que le nom source, souvent en capitales).
 */
const ENTRIES: { sourceName: string; slug: string; name: string }[] = [
    { sourceName: "ACCESSOIRES ET ÉQUIPEMENTS ESSENTIELS", slug: "accessoires-et-equipements", name: "Accessoires & équipements" },
    { sourceName: "CONTENEUR 20 PIEDS", slug: "conteneurs-20-pieds", name: "Conteneurs 20 pieds" },
    { sourceName: "Conteneur 40 Pieds", slug: "conteneurs-40-pieds", name: "Conteneurs 40 pieds" },
    { sourceName: "Conteneur Bar", slug: "conteneurs-bar", name: "Conteneurs bar" },
    { sourceName: "Conteneur de bureaux", slug: "conteneurs-bureau", name: "Conteneurs bureau" },
    { sourceName: "Conteneur de Stockage", slug: "conteneurs-stockage", name: "Conteneurs de stockage" },
    { sourceName: "Conteneur Frigorifique", slug: "conteneurs-frigorifiques", name: "Conteneurs frigorifiques" },
    { sourceName: "CONTENEURS 15 PIEDS", slug: "conteneurs-15-pieds", name: "Conteneurs 15 pieds" },
    { sourceName: "Conteneurs Piscines", slug: "conteneurs-piscine", name: "Conteneurs piscine" },
    { sourceName: "CONTENEURS SPÉCIAUX", slug: "conteneurs-speciaux", name: "Conteneurs spéciaux" },
    { sourceName: "Habitation /Maison", slug: "habitation-maison", name: "Habitation / Maison" },
    { sourceName: "LEADERS MARITIMES", slug: "leaders-maritimes", name: "Leaders maritimes" },
    { sourceName: "Mobile-Home", slug: "mobile-home", name: "Mobile-home" },
    { sourceName: "REEFER-KÜHLCONTAINER", slug: "conteneurs-reefer", name: "Conteneurs réfrigérés (Reefer)" },
];

/** Catégorie de repli quand un libellé scrapé ne correspond à aucune entrée connue. */
export const FALLBACK_CATEGORY = { slug: "non-classe", name: "Non classé" };

function normalize(s: string): string {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

const BY_NORMALIZED_SOURCE_NAME = new Map(
    ENTRIES.map((e) => [normalize(e.sourceName), { slug: e.slug, name: e.name }]),
);

export function resolveCategory(scrapedLabel: string): { slug: string; name: string } {
    return BY_NORMALIZED_SOURCE_NAME.get(normalize(scrapedLabel)) ?? FALLBACK_CATEGORY;
}
