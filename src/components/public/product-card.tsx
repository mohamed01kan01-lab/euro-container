import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/currency";
import type { ProductRating } from "@/lib/ratings";
import { RatingStars } from "./rating-stars";

const CUT_CORNER =
    "[clip-path:polygon(0_0,calc(100%-1rem)_0,100%_1rem,100%_100%,0_100%)]";

export type ProductConditionValue = "NEW" | "USED" | "REFURBISHED";

export interface ProductCardData {
    slug: string;
    name: string;
    image: string | null;
    /** Converti en number côté serveur : Decimal n'est pas sérialisable. */
    price: number;
    promoPrice: number | null;
    stock: number;
    categories: { name: string; slug: string }[];
    /** Absent ou sans avis approuvé : rien n'est affiché. */
    rating?: ProductRating | null;
    /** Optionnel : les listings qui ne le fournissent pas encore n'affichent pas le badge. */
    condition?: ProductConditionValue;
}

export async function ProductCard({
    product,
    currency,
}: {
    product: ProductCardData;
    currency: string;
}) {
    const t = await getTranslations("common");
    const mainCategory = product.categories[0];
    const onSale = product.promoPrice != null;
    const outOfStock = product.stock <= 0;
    const discount = onSale
        ? Math.round(((product.price - product.promoPrice!) / product.price) * 100)
        : 0;
    const conditionLabel =
        product.condition === "NEW"
            ? t("conditionNew")
            : product.condition === "REFURBISHED"
              ? t("conditionRefurbished")
              : product.condition === "USED"
                ? t("conditionUsed")
                : null;

    return (
        <article
            className={`group relative flex flex-col rounded-none border-2 border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:-translate-y-1 focus-within:border-primary/40 ${CUT_CORNER}`}
        >
            <div className="relative aspect-square overflow-hidden bg-muted">
                {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="h-full w-full bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
                )}

                {conditionLabel && (
                    <span className="absolute left-3 top-3 border border-foreground/20 bg-background/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-sm">
                        {conditionLabel}
                    </span>
                )}

                {onSale && !outOfStock && (
                    <span className="absolute right-3 top-3 border border-orange-900/40 bg-orange-600 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                        −{discount} %
                    </span>
                )}

                {outOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm font-medium backdrop-blur-[2px]">
                        Rupture de stock
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-4">
                {mainCategory && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        {mainCategory.name}
                    </p>
                )}

                <h3 className="text-sm font-medium leading-snug">
                    {/* Lien étendu à toute la carte : une seule cible cliquable,
                        et un seul arrêt au clavier. */}
                    <Link
                        href={`/product/${product.slug}`}
                        className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
                    >
                        {product.name}
                    </Link>
                </h3>

                {/* Un produit sans avis n'affiche rien : « 0 étoile »
                    le pénaliserait à tort. */}
                {product.rating && product.rating.count > 0 && (
                    <p className="flex items-center gap-1.5">
                        <RatingStars value={product.rating.average} size={12} />
                        <span className="text-xs text-muted-foreground">
                            ({product.rating.count})
                        </span>
                    </p>
                )}

                <p className="mt-auto flex items-baseline gap-2 pt-2">
                    <span
                        className={
                            onSale
                                ? "text-base font-semibold text-orange-600 dark:text-orange-400"
                                : "text-base font-semibold"
                        }
                    >
                        {formatPrice(
                            onSale ? product.promoPrice! : product.price,
                            currency,
                        )}
                    </span>
                    {onSale && (
                        <s className="text-xs text-muted-foreground">
                            {formatPrice(product.price, currency)}
                        </s>
                    )}
                </p>
            </div>
        </article>
    );
}
