/**
 * Importe le catalogue scrapé (scrap-pro, export JSON) dans Prisma.
 *
 * Usage :
 *   pnpm exec tsx scripts/import-products.ts --fr <chemin.json> [--en <chemin.json>] [--images <chemin.json>]
 *
 * --images pointe vers un export scrap-pro plus récent (mêmes produits, ré-scrapé
 * uniquement pour retélécharger les images sans repayer une réécriture IA) : les
 * URLs d'images de ce fichier remplacent celles du fichier --fr, matchées par
 * l'URL produit (stable). Utile quand le TTL de nettoyage des images scrap-pro
 * (dossier output/images/<job_id>) a expiré avant l'import.
 *
 * Tout est importé en status DRAFT — relecture humaine obligatoire dans
 * /dashboard/products avant publication (contenu réécrit par IA).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { resolveCategory } from "./lib/category-map";

interface ScrapedProduct {
    id: string | null;
    name: string;
    url: string;
    price: string | null;
    regular_price: string | null;
    sale_price: string | null;
    currency: string | null;
    description: string | null;
    short_description: string | null;
    sku: string | null;
    images: string[];
    categories: string[];
    tags: string[];
    in_stock: boolean | null;
    attributes: Record<string, string>;
}

interface ScrapeResult {
    source_url: string;
    total_products: number;
    products: ScrapedProduct[];
}

// ─── Args ───────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

const frPath = getArg("fr");
if (!frPath) {
    console.error("Usage: tsx scripts/import-products.ts --fr <chemin.json> [--en <chemin.json>]");
    process.exit(1);
}
const enPath = getArg("en");
const imagesPath = getArg("images");

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePrice(raw: string | null): number | null {
    if (!raw) return null;
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function detectCondition(text: string): "NEW" | "USED" | "REFURBISHED" {
    const t = text.toLowerCase();
    if (/reconditionn/.test(t)) return "REFURBISHED";
    if (/occasion/.test(t)) return "USED";
    return "NEW";
}

function detectSizeTag(text: string): string | null {
    const m = text.match(/\b(10|15|20|40)\s*pieds\b/i);
    return m ? `${m[1]}-pieds` : null;
}

/** URL locale scrap-pro (http://host/images/<job_id>/<file>) -> chemin disque du fichier téléchargé. */
function localImagePath(imageUrl: string): string | null {
    const m = imageUrl.match(/\/images\/([^/]+)\/([^/?]+)$/);
    if (!m) return null;
    const [, jobId, filename] = m;
    return `C:/Users/hermannRichy/Desktop/scrap-pro/output/images/${jobId}/${filename}`;
}

// ─── Cloudinary ─────────────────────────────────────────────────────────────

async function configureCloudinary() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!settings?.cloudinaryCloudName || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
        throw new Error("Cloudinary non configuré dans SiteSettings.");
    }
    cloudinary.config({
        cloud_name: settings.cloudinaryCloudName,
        api_key: settings.cloudinaryApiKey,
        api_secret: settings.cloudinaryApiSecret,
    });
}

async function uploadImages(imageUrls: string[], productSlug: string): Promise<string[]> {
    const uploaded: string[] = [];
    for (const imageUrl of imageUrls) {
        const localPath = localImagePath(imageUrl);
        const source = localPath ?? imageUrl;
        try {
            const result = await cloudinary.uploader.upload(source, {
                folder: "euro-container/products",
                public_id: `${productSlug}-${uploaded.length + 1}`,
                overwrite: true,
                resource_type: "image",
            });
            uploaded.push(result.secure_url);
        } catch (err) {
            console.warn(`  ⚠ Échec upload image (${source}) : ${(err as Error).message}`);
        }
    }
    return uploaded;
}

// ─── Import ─────────────────────────────────────────────────────────────────

async function main() {
    await configureCloudinary();

    const fr: ScrapeResult = JSON.parse(readFileSync(frPath!, "utf-8"));
    const en: ScrapeResult | null = enPath ? JSON.parse(readFileSync(enPath, "utf-8")) : null;
    const enBySourceUrl = new Map((en?.products ?? []).map((p) => [p.url, p]));
    const imagesOverride: ScrapeResult | null = imagesPath
        ? JSON.parse(readFileSync(imagesPath, "utf-8"))
        : null;
    const imagesBySourceUrl = new Map(
        (imagesOverride?.products ?? []).map((p) => [p.url, p.images]),
    );

    console.log(`Import de ${fr.total_products} produits (FR${en ? " + EN" : ""})...`);

    let imported = 0;
    const categoryWarnings = new Set<string>();
    const priceWarnings: string[] = [];
    const failedProducts: string[] = [];

    for (const p of fr.products) {
      try {
        const price = parsePrice(p.regular_price) ?? parsePrice(p.price);
        if (price === null) {
            priceWarnings.push(p.name);
            continue;
        }
        const salePrice = parsePrice(p.sale_price);
        const promoPrice = salePrice !== null && salePrice < price ? salePrice : null;

        const slug = generateSlug(p.name);
        const fullText = `${p.name} ${p.description ?? ""}`;
        const condition = detectCondition(fullText);
        const sizeTag = detectSizeTag(fullText);
        const stock = p.in_stock === true ? 10 : 0;

        // Catégories : upsert par slug résolu, avertissement si aucune correspondance connue.
        const categoryRefs = p.categories.length > 0 ? p.categories : ["__none__"];
        const resolvedCategories = categoryRefs.map((label) => {
            const cat = resolveCategory(label);
            if (cat.slug === "non-classe") categoryWarnings.add(label);
            return cat;
        });
        const uniqueCategories = [...new Map(resolvedCategories.map((c) => [c.slug, c])).values()];

        for (const cat of uniqueCategories) {
            await prisma.productCategory.upsert({
                where: { slug: cat.slug },
                create: { slug: cat.slug, name: cat.name },
                update: {},
            });
        }

        let sizeTagId: string | undefined;
        if (sizeTag) {
            const tag = await prisma.productTag.upsert({
                where: { slug: sizeTag },
                create: { slug: sizeTag, name: sizeTag.replace("-", " ") },
                update: {},
            });
            sizeTagId = tag.id;
        }

        console.log(`→ ${p.name} (${uniqueCategories.map((c) => c.name).join(", ")})`);
        const sourceImages = imagesBySourceUrl.get(p.url) ?? p.images;
        const images = await uploadImages(sourceImages, slug);

        const enMatch = enBySourceUrl.get(p.url);

        const categoryRows = await prisma.productCategory.findMany({
            where: { slug: { in: uniqueCategories.map((c) => c.slug) } },
            select: { id: true },
        });

        // Identité stable = SKU (inchangé entre deux scrapes) quand il existe ;
        // le slug seul ne suffit pas car il dérive du nom réécrit par l'IA,
        // qui varie d'une passe à l'autre pour le même produit réel.
        const sku = p.sku?.trim() ? p.sku.trim() : undefined;
        const existing = sku
            ? await prisma.product.findFirst({ where: { OR: [{ sku }, { slug }] } })
            : await prisma.product.findUnique({ where: { slug } });

        const product = existing
            ? await prisma.product.update({
                  where: { id: existing.id },
                  data: {
                      name: p.name,
                      slug,
                      description: p.description ?? undefined,
                      images,
                      price,
                      promoPrice,
                      stock,
                      sku,
                      condition,
                  },
              })
            : await prisma.product.create({
                  data: {
                      name: p.name,
                      slug,
                      description: p.description ?? undefined,
                      images,
                      price,
                      promoPrice,
                      stock,
                      sku,
                      condition,
                      status: "DRAFT",
                      categories: {
                          create: categoryRows.map((c) => ({ categoryId: c.id })),
                      },
                      ...(sizeTagId && { tags: { create: [{ tagId: sizeTagId }] } }),
                  },
              });

        if (enMatch) {
            await prisma.productTranslation.upsert({
                where: { productId_locale: { productId: product.id, locale: "en" } },
                create: {
                    productId: product.id,
                    locale: "en",
                    name: enMatch.name,
                    slug: generateSlug(enMatch.name),
                    description: enMatch.description ?? undefined,
                },
                update: {
                    name: enMatch.name,
                    description: enMatch.description ?? undefined,
                },
            });
        }

        imported++;
      } catch (err) {
        // Un produit en échec (contrainte unique, réseau, etc.) ne doit pas
        // faire perdre les 84 autres — comportement déjà appris à nos dépens
        // sur la réécriture SEO scrap-pro (échec silencieux vs. échec qui tue
        // tout le lot sont les deux extrêmes à éviter).
        failedProducts.push(`${p.name} (${(err as Error).message ?? err})`);
      }
    }

    console.log("\n── Résumé ──");
    console.log(`${imported} produit(s) importé(s) en DRAFT.`);
    if (categoryWarnings.size > 0) {
        console.log(`Catégories non reconnues (→ "Non classé") : ${[...categoryWarnings].join(", ")}`);
    }
    if (priceWarnings.length > 0) {
        console.log(`Prix illisible, produit ignoré : ${priceWarnings.join(", ")}`);
    }
    if (failedProducts.length > 0) {
        console.log(`Échecs (${failedProducts.length}) :\n  - ${failedProducts.join("\n  - ")}`);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
