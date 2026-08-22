import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { IconChevronRight } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { formatPrice } from "@/lib/currency";
import { getRatingMap } from "@/lib/ratings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductGallery } from "@/components/public/product-gallery";
import { AddToCart } from "@/components/public/add-to-cart";
import { RatingStars } from "@/components/public/rating-stars";
import { ReviewsSection } from "@/components/public/reviews-section";
import {
    ProductCard,
    type ProductCardData,
} from "@/components/public/product-card";

export const revalidate = 300;

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
    return prisma.product.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
            categories: {
                include: {
                    category: { select: { id: true, name: true, slug: true } },
                },
            },
            tags: { include: { tag: { select: { id: true, name: true } } } },
            variants: {
                select: { id: true, name: true, value: true, stock: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const [product, settings] = await Promise.all([
        getProduct(slug),
        getSiteSettings(),
    ]);
    if (!product) return {};

    // La description est du HTML : la dépouiller pour la meta.
    const plain = product.description
        ?.replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return {
        title: product.seoTitle || product.name,
        description: product.seoDescription || plain?.slice(0, 160) || undefined,
        robots: { index: true, follow: true },
        openGraph: {
            title: product.seoTitle || product.name,
            description:
                product.seoDescription || plain?.slice(0, 160) || undefined,
            type: "website",
            siteName: settings.siteName,
            ...(product.images[0] && { images: [{ url: product.images[0] }] }),
        },
    };
}

export default async function ProductPage({ params }: PageProps) {
    const { slug } = await params;
    const [product, settings] = await Promise.all([
        getProduct(slug),
        getSiteSettings(),
    ]);
    if (!product) notFound();

    const { currency } = settings;
    const price = Number(product.price);
    const promoPrice =
        product.promoPrice === null ? null : Number(product.promoPrice);
    const onSale = promoPrice !== null;
    const discount = onSale
        ? Math.round(((price - promoPrice) / price) * 100)
        : 0;

    const firstCategory = product.categories[0]?.category;

    // Note moyenne affichée sous le titre : seuls les avis approuvés comptent.
    const ratingAgg = await prisma.productReview.aggregate({
        where: { productId: product.id, status: "APPROVED" },
        _avg: { rating: true },
        _count: { rating: true },
    });
    const reviewCount = ratingAgg._count.rating;
    const averageRating = ratingAgg._avg.rating ?? 0;

    const related = await prisma.product.findMany({
        where: {
            status: "PUBLISHED",
            id: { not: product.id },
            ...(firstCategory && {
                categories: { some: { categoryId: firstCategory.id } },
            }),
        },
        include: {
            categories: {
                include: { category: { select: { name: true, slug: true } } },
            },
        },
        orderBy: { publishedAt: "desc" },
        take: 4,
    });

    const relatedRatings = await getRatingMap(related.map((p) => p.id));

    const relatedSerialized: ProductCardData[] = related.map((p) => ({
        slug: p.slug,
        name: p.name,
        image: p.images[0] ?? null,
        price: Number(p.price),
        promoPrice: p.promoPrice === null ? null : Number(p.promoPrice),
        stock: p.stock,
        categories: p.categories.map((c) => c.category),
        rating: relatedRatings.get(p.id) ?? null,
    }));

    const stock =
        product.stock <= 0
            ? { label: "Rupture de stock", dot: "bg-destructive" }
            : product.stock <= product.lowStockThreshold
              ? {
                    label: `Plus que ${product.stock} en stock`,
                    dot: "bg-orange-500",
                }
              : { label: "En stock", dot: "bg-green-500" };

    const specs = [
        product.sku && { label: "Référence", value: product.sku },
        product.mpn && { label: "MPN", value: product.mpn },
        product.gtin && { label: "GTIN", value: product.gtin },
        // Decimal est un objet : toujours truthy, d'où la conversion explicite.
        product.weight !== null &&
            Number(product.weight) > 0 && {
                label: "Poids",
                value: `${Number(product.weight)} kg`,
            },
    ].filter((s): s is { label: string; value: string } => !!s);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
            <nav
                aria-label="Fil d'Ariane"
                className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
                <Link
                    href="/shop"
                    className="transition-colors hover:text-foreground"
                >
                    Boutique
                </Link>
                {firstCategory && (
                    <>
                        <IconChevronRight size={14} aria-hidden />
                        <Link
                            href={`/shop?category=${firstCategory.slug}`}
                            className="transition-colors hover:text-foreground"
                        >
                            {firstCategory.name}
                        </Link>
                    </>
                )}
                <IconChevronRight size={14} aria-hidden />
                <span className="truncate text-foreground">{product.name}</span>
            </nav>

            <article className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
                <ProductGallery images={product.images} alt={product.name} />

                {/* Panneau produit, collant sur grand écran */}
                <div className="lg:sticky lg:top-24">
                    <header className="space-y-4">
                        {product.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {product.categories.map(({ category }) => (
                                    <Link
                                        key={category.id}
                                        href={`/shop?category=${category.slug}`}
                                        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        {category.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                            {product.name}
                        </h1>

                        {reviewCount > 0 && (
                            <a
                                href="#avis"
                                className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <RatingStars value={averageRating} size={15} />
                                <span>
                                    {averageRating.toFixed(1)} · {reviewCount}{" "}
                                    avis
                                </span>
                            </a>
                        )}

                        <div className="flex flex-wrap items-baseline gap-3">
                            <span
                                className={
                                    onSale
                                        ? "text-3xl font-bold text-orange-600 dark:text-orange-400"
                                        : "text-3xl font-bold"
                                }
                            >
                                {formatPrice(
                                    onSale ? promoPrice : price,
                                    currency,
                                )}
                            </span>
                            {onSale && (
                                <>
                                    <s className="text-lg text-muted-foreground">
                                        {formatPrice(price, currency)}
                                    </s>
                                    <Badge className="rounded-full bg-orange-600 text-white">
                                        −{discount} %
                                    </Badge>
                                </>
                            )}
                        </div>

                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span
                                className={`h-2 w-2 rounded-full ${stock.dot}`}
                                aria-hidden
                            />
                            {stock.label}
                        </p>
                    </header>

                    <Separator className="my-6" />

                    {/* Sélection de variante et ajout au panier. */}
                    <AddToCart
                        productId={product.id}
                        productStock={product.stock}
                        variants={product.variants}
                    />

                    <Separator className="my-6" />

                    {product.description && (
                        <div
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{
                                __html: product.description,
                            }}
                        />
                    )}

                    {specs.length > 0 && (
                        <dl className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
                            {specs.map((spec) => (
                                <div
                                    key={spec.label}
                                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                                >
                                    <dt className="text-muted-foreground">
                                        {spec.label}
                                    </dt>
                                    <dd className="font-mono text-xs">
                                        {spec.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {product.tags.length > 0 && (
                        <footer className="mt-6 flex flex-wrap gap-2">
                            {product.tags.map(({ tag }) => (
                                <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="rounded-full font-normal"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </footer>
                    )}
                </div>
            </article>

            <section id="avis" className="mt-20 border-t border-border pt-10">
                <ReviewsSection
                    productId={product.id}
                    productSlug={product.slug}
                />
            </section>

            {relatedSerialized.length > 0 && (
                <aside className="mt-20 border-t border-border pt-10">
                    <h2 className="mb-6 text-xl font-semibold tracking-tight">
                        Produits similaires
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {relatedSerialized.map((p) => (
                            <ProductCard
                                key={p.slug}
                                product={p}
                                currency={currency}
                            />
                        ))}
                    </div>
                </aside>
            )}
        </div>
    );
}
