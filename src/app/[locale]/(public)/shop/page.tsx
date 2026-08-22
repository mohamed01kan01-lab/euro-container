import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import {
    IconChevronLeft,
    IconChevronRight,
    IconPackageOff,
} from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getRatingMap } from "@/lib/ratings";
import {
    ProductCard,
    type ProductCardData,
} from "@/components/public/product-card";
import { Button } from "@/components/public/button";
import { CategoryFilterDrawer } from "@/components/public/category-filter-drawer";

export const revalidate = 60;

const PER_PAGE = 12;

const SORTS = {
    recent: { label: "Nouveautés", orderBy: { publishedAt: "desc" as const } },
    "price-asc": { label: "Prix croissant", orderBy: { price: "asc" as const } },
    "price-desc": {
        label: "Prix décroissant",
        orderBy: { price: "desc" as const },
    },
    name: { label: "A → Z", orderBy: { name: "asc" as const } },
};
type SortKey = keyof typeof SORTS;

interface PageProps {
    searchParams: Promise<{
        category?: string;
        page?: string;
        sort?: string;
        q?: string;
    }>;
}

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    return {
        title: `Boutique — ${settings.siteName}`,
        description:
            settings.seoDescription || settings.description || undefined,
        robots: { index: true, follow: true },
    };
}

export default async function ShopPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? "1", 10));
    const categorySlug = params.category ?? "";
    const query = (params.q ?? "").trim();
    const sort: SortKey =
        params.sort && params.sort in SORTS ? (params.sort as SortKey) : "recent";

    const where = {
        status: "PUBLISHED" as const,
        ...(categorySlug && {
            categories: { some: { category: { slug: categorySlug } } },
        }),
        ...(query && {
            name: { contains: query, mode: "insensitive" as const },
        }),
    };

    const [settings, categories, rawProducts, total] = await Promise.all([
        getSiteSettings(),
        prisma.productCategory.findMany({
            select: { id: true, name: true, slug: true },
            orderBy: { name: "asc" },
        }),
        prisma.product.findMany({
            where,
            include: {
                categories: {
                    include: { category: { select: { name: true, slug: true } } },
                },
                _count: { select: { variants: true } },
            },
            orderBy: SORTS[sort].orderBy,
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE + 1,
        }),
        prisma.product.count({ where }),
    ]);

    const hasNext = rawProducts.length > PER_PAGE;
    const hasPrev = page > 1;
    const products = rawProducts.slice(0, PER_PAGE);

    const ratings = await getRatingMap(products.map((p) => p.id));

    const serialized: ProductCardData[] = products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        image: p.images[0] ?? null,
        price: Number(p.price),
        promoPrice: p.promoPrice === null ? null : Number(p.promoPrice),
        stock: p.stock,
        categories: p.categories.map((c) => c.category),
        rating: ratings.get(p.id) ?? null,
        condition: p.condition,
        hasVariants: p._count.variants > 0,
    }));

    const activeCategory = categories.find((c) => c.slug === categorySlug);

    function pageUrl(p: number, cat?: string, s?: SortKey) {
        const qs = new URLSearchParams();
        if (cat) qs.set("category", cat);
        if (s && s !== "recent") qs.set("sort", s);
        if (query) qs.set("q", query);
        if (p > 1) qs.set("page", String(p));
        return `/shop${qs.size ? "?" + qs.toString() : ""}`;
    }

    return (
        <>
            {/* Hero */}
            <section className="border-b border-border bg-linear-to-b from-muted/50 to-background">
                <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
                    <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                        {query
                            ? `Résultats pour « ${query} »`
                            : activeCategory
                              ? activeCategory.name
                              : "Boutique"}
                    </h1>
                    <p className="mt-3 max-w-xl text-muted-foreground">
                        {activeCategory
                            ? `${total} produit${total !== 1 ? "s" : ""} dans cette catégorie.`
                            : (settings.slogan ??
                              `Découvrez nos ${total} produit${total !== 1 ? "s" : ""}.`)}
                    </p>
                </div>
            </section>

            {/* Barre de filtres, collante sous le header du layout public */}
            <div className="sticky top-14 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    {categories.length > 0 && (
                        <>
                            <CategoryFilterDrawer
                                label="Filtrer par catégorie"
                                options={[
                                    {
                                        label: "Tous",
                                        href: pageUrl(1, undefined, sort),
                                        active: !categorySlug,
                                    },
                                    ...categories.map((cat) => ({
                                        label: cat.name,
                                        href: pageUrl(1, cat.slug, sort),
                                        active: categorySlug === cat.slug,
                                    })),
                                ]}
                            />
                            <nav
                                aria-label="Filtrer par catégorie"
                                className="-mx-1 hidden gap-1.5 overflow-x-auto px-1 pb-1 md:flex lg:pb-0"
                            >
                                <FilterPill
                                    href={pageUrl(1, undefined, sort)}
                                    active={!categorySlug}
                                >
                                    Tous
                                </FilterPill>
                                {categories.map((cat) => (
                                    <FilterPill
                                        key={cat.id}
                                        href={pageUrl(1, cat.slug, sort)}
                                        active={categorySlug === cat.slug}
                                    >
                                        {cat.name}
                                    </FilterPill>
                                ))}
                            </nav>
                        </>
                    )}

                    {/* Tri par liens : l'état reste dans l'URL, donc partageable
                        et indexable, contrairement à un select contrôlé. */}
                    <nav
                        aria-label="Trier les produits"
                        className="-mx-1 flex shrink-0 items-center gap-1 overflow-x-auto rounded-full bg-muted p-1"
                    >
                        {(Object.keys(SORTS) as SortKey[]).map((key) => (
                            <Link
                                key={key}
                                href={pageUrl(1, categorySlug || undefined, key)}
                                aria-current={sort === key}
                                className={
                                    sort === key
                                        ? "whitespace-nowrap rounded-full bg-background px-3.5 py-1.5 text-xs font-medium shadow-sm"
                                        : "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                }
                            >
                                {SORTS[key].label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <section className="mx-auto max-w-6xl space-y-10 px-4 py-10">
                {serialized.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <IconPackageOff
                                size={24}
                                className="text-muted-foreground"
                            />
                        </span>
                        <div className="space-y-1">
                            <p className="font-medium">
                                Aucun produit
                                {categorySlug ? " dans cette catégorie" : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Revenez bientôt, le catalogue s&apos;étoffe.
                            </p>
                        </div>
                        {categorySlug && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/shop">Voir tout le catalogue</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {serialized.map((product) => (
                            <ProductCard
                                key={product.slug}
                                product={product}
                                currency={settings.currency}
                            />
                        ))}
                    </div>
                )}

                {(hasPrev || hasNext) && (
                    <nav
                        aria-label="Pagination des produits"
                        className="flex items-center justify-between border-t border-border pt-6"
                    >
                        {hasPrev ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={pageUrl(
                                        page - 1,
                                        categorySlug || undefined,
                                        sort,
                                    )}
                                >
                                    <IconChevronLeft size={16} className="mr-1" />
                                    Précédent
                                </Link>
                            </Button>
                        ) : (
                            <span />
                        )}

                        <span className="text-sm text-muted-foreground">
                            Page {page}
                        </span>

                        {hasNext ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={pageUrl(
                                        page + 1,
                                        categorySlug || undefined,
                                        sort,
                                    )}
                                >
                                    Suivant
                                    <IconChevronRight size={16} className="ml-1" />
                                </Link>
                            </Button>
                        ) : (
                            <span />
                        )}
                    </nav>
                )}
            </section>
        </>
    );
}

function FilterPill({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            aria-current={active}
            className={
                active
                    ? "whitespace-nowrap rounded-full bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
                    : "whitespace-nowrap rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-orange-600/40 hover:text-foreground"
            }
        >
            {children}
        </Link>
    );
}
