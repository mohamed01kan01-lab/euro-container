import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
    IconRecycle,
    IconRulerMeasure,
    IconTruckDelivery,
    IconArrowRight,
    IconMail,
    IconSearch,
    IconMapPin,
} from "@tabler/icons-react";
import { Link, getPathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getRatingMap } from "@/lib/ratings";
import {
    ProductCard,
    type ProductCardData,
} from "@/components/public/product-card";
import { PostCard, type PostCardData } from "@/components/public/post-card";
import { Button } from "@/components/public/button";
import { SectionEyebrow } from "@/components/public/section-eyebrow";
import { CurveAccent } from "@/components/public/curve-accent";
import { Marquee } from "@/components/public/marquee";
import { Input } from "@/components/ui/input";

export const revalidate = 60;

// Catégories visuellement les plus parlantes pour le hero (piscine/bar/bureau
// se photographient mieux qu'un conteneur maritime brut) — ordre de préférence.
const HERO_CATEGORY_SLUGS = ["conteneurs-piscine", "conteneurs-bar", "conteneurs-bureau"];

/** Rotation de base (`--float-rotate`) + délai d'amorce par photo du collage hero. */
const COLLAGE_SLOTS = [
    {
        wrap: "absolute top-[6%] left-[20%] w-[58%] aspect-[4/5] z-20 animate-float-1",
        rotate: "0deg",
        delay: "0s",
        border: "border-[8px] border-primary rounded-[28px]",
    },
    {
        wrap: "absolute top-0 left-0 w-[32%] aspect-square z-30 animate-float-2",
        rotate: "-6deg",
        delay: "-2s",
        border: "border-[5px] border-background rounded-[20px]",
    },
    {
        wrap: "absolute bottom-[2%] -left-[4%] w-[34%] aspect-[4/5] z-40 animate-float-1",
        rotate: "5deg",
        delay: "-6s",
        border: "border-[5px] border-background rounded-[20px]",
    },
    {
        wrap: "absolute top-[2%] -right-[6%] w-[30%] aspect-square z-30 animate-float-2",
        rotate: "4deg",
        delay: "-9s",
        border: "border-[5px] border-background rounded-[20px]",
    },
    {
        wrap: "absolute bottom-0 right-[4%] w-[28%] aspect-[4/5] z-40 animate-float-1",
        rotate: "-5deg",
        delay: "-3s",
        border: "border-[5px] border-background rounded-[20px]",
    },
] as const;

interface ProcessStep {
    title: string;
    body: string;
}

interface AboutValue {
    title: string;
    body: string;
}

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    return {
        description: settings.seoDescription || settings.description || undefined,
        robots: { index: true, follow: true },
    };
}

export default async function HomePage() {
    const [t, tAbout, locale] = await Promise.all([
        getTranslations("home"),
        getTranslations("about"),
        getLocale(),
    ]);
    const shopHref = getPathname({ href: "/shop", locale });

    const [settings, categoriesRaw, rawProducts, rawPosts, heroCandidates, totalProducts] =
        await Promise.all([
            getSiteSettings(),
            prisma.productCategory.findMany({
                where: { parentId: null },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    _count: { select: { products: true } },
                    products: {
                        take: 1,
                        where: { product: { images: { isEmpty: false } } },
                        select: { product: { select: { images: true } } },
                    },
                },
                orderBy: { name: "asc" },
            }),
            prisma.product.findMany({
                where: { status: "PUBLISHED" },
                include: {
                    categories: {
                        include: { category: { select: { name: true, slug: true } } },
                    },
                    _count: { select: { variants: true } },
                },
                orderBy: { publishedAt: "desc" },
                take: 8,
            }),
            prisma.post.findMany({
                where: { status: "PUBLISHED" },
                include: {
                    author: { select: { name: true, image: true } },
                    categories: {
                        include: { category: { select: { name: true, slug: true } } },
                    },
                },
                orderBy: { publishedAt: "desc" },
                take: 3,
            }),
            prisma.product.findMany({
                where: {
                    status: "PUBLISHED",
                    images: { isEmpty: false },
                    categories: {
                        some: { category: { slug: { in: HERO_CATEGORY_SLUGS } } },
                    },
                },
                select: { images: true },
                orderBy: { publishedAt: "desc" },
                take: 10,
            }),
            prisma.product.count({ where: { status: "PUBLISHED" } }),
        ]);

    const ratings = await getRatingMap(rawProducts.map((p) => p.id));
    const products: ProductCardData[] = rawProducts.map((p) => ({
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

    const posts: PostCardData[] = rawPosts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        featuredImage: p.featuredImage,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
        author: p.author,
        categories: p.categories,
    }));

    const categories = categoriesRaw.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat._count.products,
        image: cat.products[0]?.product.images[0] ?? null,
    }));

    // Mosaïque du hero : priorité aux catégories "visuelles" (piscine/bar/bureau),
    // complétée par les derniers produits publiés si le catalogue en a peu.
    const heroImages = Array.from(
        new Set(
            [
                ...heroCandidates.flatMap((p) => p.images.slice(0, 1)),
                ...products.map((p) => p.image).filter((img): img is string => !!img),
            ],
        ),
    ).slice(0, 5);

    const process = tAbout.raw("process") as ProcessStep[];
    const deliveryValue = (tAbout.raw("values") as AboutValue[])[2];
    const deliveryZones = t.raw("deliveryZones") as string[];

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden bg-linear-to-b from-secondary/60 to-background">
                <div className="animate-float-1 absolute -right-20 -top-32 h-115 w-115 rounded-full bg-orange-600 opacity-15 blur-[10px]" />
                <div className="animate-float-2 absolute -bottom-28 -left-18 h-75 w-75 rounded-full bg-primary opacity-12 blur-[8px]" />
                <CurveAccent
                    variant="arc"
                    color="var(--color-primary)"
                    rotate={20}
                    className="absolute -left-8 -top-6 h-45 w-45 opacity-30 sm:h-65 sm:w-65 lg:h-95 lg:w-95"
                />
                <CurveAccent
                    variant="wave"
                    color="#EA580C"
                    rotate={-8}
                    className="absolute -bottom-8 -right-8 h-40 w-40 opacity-25 sm:h-58 sm:w-58 lg:h-85 lg:w-85"
                />

                <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
                    <div>
                        <SectionEyebrow>{t("heroEyebrow")}</SectionEyebrow>
                        <h1 className="max-w-xl font-display text-4xl leading-[0.95] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                            {settings.slogan ?? settings.siteName}
                        </h1>
                        {settings.description && (
                            <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
                                {settings.description}
                            </p>
                        )}

                        <form
                            action={shopHref}
                            method="GET"
                            className="mt-8 flex max-w-lg items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-sm"
                        >
                            <IconSearch
                                size={18}
                                className="shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                name="q"
                                placeholder={t("searchPlaceholder")}
                                className="h-9 rounded-full border-0 shadow-none focus-visible:ring-0"
                            />
                            <Button type="submit" size="sm" variant="accent">
                                {t("searchCta")}
                            </Button>
                        </form>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Button asChild size="lg" variant="accent">
                                <Link href="/shop">
                                    {t("ctaShop")}
                                    <IconArrowRight size={18} className="ml-1.5" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <Link href="/contact">
                                    <IconMail size={18} className="mr-1.5" />
                                    {t("ctaContact")}
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-10 grid grid-cols-3 gap-x-4 sm:gap-x-8">
                            <HeroStat
                                value={String(totalProducts)}
                                label={t("heroStatProducts")}
                            />
                            <HeroStat
                                value={String(categories.length)}
                                label={t("heroStatCategories")}
                                bordered
                            />
                            <HeroStat value="20+" label={t("heroStatYears")} bordered />
                        </div>
                    </div>

                    <div className="relative aspect-square">
                        <div className="absolute inset-[8%_6%] rounded-full bg-orange-600 opacity-20 blur-[30px]" />
                        {heroImages.length > 0 ? (
                            COLLAGE_SLOTS.slice(0, heroImages.length).map((slot, i) => (
                                <div
                                    key={heroImages[i]}
                                    className={slot.wrap}
                                    style={
                                        {
                                            "--float-rotate": slot.rotate,
                                            animationDelay: slot.delay,
                                        } as React.CSSProperties
                                    }
                                >
                                    <div
                                        className={`h-full w-full overflow-hidden bg-muted shadow-[0_18px_38px_rgba(0,0,0,.2)] ${slot.border}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={heroImages[i]}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full w-full rounded-[28px] border-8 border-primary bg-linear-to-br from-primary/15 via-primary/5 to-transparent" />
                        )}
                    </div>
                </div>
            </section>

            <Marquee
                words={[
                    t("trustNewUsed"),
                    t("trustSizes"),
                    t("trustDelivery"),
                    t("statsYears"),
                ]}
            />

            {/* Catégories */}
            {categories.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                    <div className="max-w-xl">
                        <SectionEyebrow>{t("categoriesEyebrow")}</SectionEyebrow>
                        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                            {t("categoriesTitle")}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            {t("categoriesSubtitle")}
                        </p>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:auto-rows-[160px] lg:grid-flow-dense">
                        {categories.map((cat, index) => (
                            <Link
                                key={cat.id}
                                href={`/shop?category=${cat.slug}`}
                                className={cn(
                                    "group relative flex flex-col justify-end overflow-hidden rounded-[20px] bg-muted transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,.3)]",
                                    index === 0
                                        ? "col-span-2 aspect-video rounded-[26px] sm:aspect-4/3 lg:col-span-2 lg:row-span-2 lg:aspect-auto"
                                        : "aspect-4/3 lg:aspect-auto",
                                )}
                            >
                                {cat.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={cat.image}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-linear-to-br from-primary/15 via-primary/5 to-transparent" />
                                )}
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="relative flex items-center justify-between gap-2 p-4">
                                    <span className="text-sm font-semibold leading-snug text-white">
                                        {cat.name}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-white/80">
                                        {cat.count}
                                        <IconArrowRight
                                            size={14}
                                            className="transition-transform group-hover:translate-x-0.5"
                                        />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Comment ça marche */}
            <section className="relative overflow-hidden border-t border-border bg-secondary/30">
                <CurveAccent
                    variant="swoosh"
                    color="var(--color-primary)"
                    rotate={200}
                    className="absolute bottom-0 left-0 h-20 w-20 opacity-20 sm:h-30 sm:w-30 lg:h-37.5 lg:w-37.5"
                />
                <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
                    <div className="max-w-xl">
                        <SectionEyebrow>{t("processEyebrow")}</SectionEyebrow>
                        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                            {tAbout("processTitle")}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            {t("processSubtitle")}
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 sm:grid-cols-3">
                        {process.map((step, index) => (
                            <div
                                key={step.title}
                                className="rounded-[26px] border border-border bg-card p-6 transition-all hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,.2)]"
                            >
                                <div className="font-display text-4xl leading-none text-orange-600">
                                    0{index + 1}
                                </div>
                                <p className="mt-3 font-semibold">{step.title}</p>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {step.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Produits récents */}
            <section className="border-t border-border bg-primary text-primary-foreground">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="max-w-xl">
                            <SectionEyebrow invert>{t("productsEyebrow")}</SectionEyebrow>
                            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                                {t("productsTitle")}
                            </h2>
                            <p className="mt-2 text-primary-foreground/70">
                                {t("productsSubtitle")}
                            </p>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="border-primary-foreground/30 text-primary-foreground hover:border-primary-foreground/50 hover:bg-primary-foreground/10"
                        >
                            <Link href="/shop">
                                {t("productsCta")}
                                <IconArrowRight size={16} className="ml-1.5" />
                            </Link>
                        </Button>
                    </div>

                    {products.length > 0 ? (
                        <div className="mt-8 grid gap-5 text-foreground sm:grid-cols-2 lg:grid-cols-4">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.slug}
                                    product={product}
                                    currency={settings.currency}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-8 text-sm text-primary-foreground/70">
                            {t("productsEmpty")}
                        </p>
                    )}
                </div>
            </section>

            {/* Bandeau confiance */}
            <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                <div className="max-w-xl">
                    <SectionEyebrow>{t("trustEyebrow")}</SectionEyebrow>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                    <TrustCard
                        icon={<IconRecycle size={22} />}
                        title={t("trustNewUsed")}
                        description={t("trustNewUsedDesc")}
                    />
                    <TrustCard
                        icon={<IconRulerMeasure size={22} />}
                        title={t("trustSizes")}
                        description={t("trustSizesDesc")}
                    />
                    <TrustCard
                        icon={<IconTruckDelivery size={22} />}
                        title={t("trustDelivery")}
                        description={t("trustDeliveryDesc")}
                    />
                </div>
            </section>

            {/* Zones de livraison */}
            {deliveryValue && (
                <section className="border-t border-border bg-primary text-primary-foreground">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                        <div className="max-w-xl">
                            <SectionEyebrow invert>{t("deliveryEyebrow")}</SectionEyebrow>
                            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                                {deliveryValue.title}
                            </h2>
                            <p className="mt-2 text-primary-foreground/70">
                                {deliveryValue.body}
                            </p>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {deliveryZones.map((zone) => (
                                <span
                                    key={zone}
                                    className="flex items-center gap-2 rounded-full border border-primary-foreground/25 px-4 py-2 text-sm font-medium"
                                >
                                    <IconMapPin size={16} className="text-orange-400" />
                                    {zone}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Blog */}
            {posts.length > 0 && (
                <section className="border-t border-border bg-secondary/30">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <SectionEyebrow>{t("blogEyebrow")}</SectionEyebrow>
                                <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                                    {t("blogTitle")}
                                </h2>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/blog">
                                    {t("blogCta")}
                                    <IconArrowRight size={16} className="ml-1.5" />
                                </Link>
                            </Button>
                        </div>
                        <div className="mt-8 grid gap-5 sm:grid-cols-3">
                            {posts.map((post) => (
                                <PostCard key={post.slug} post={post} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA contact */}
            {(settings.contactEmail || settings.phone) && (
                <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
                    <div className="relative overflow-hidden rounded-[34px] border border-orange-600/25 bg-orange-600/5 px-6 py-14 text-center sm:py-16">
                        <CurveAccent
                            variant="spiral"
                            color="#EA580C"
                            rotate={40}
                            className="absolute -bottom-8 -left-8 h-20 w-20 opacity-25 sm:h-27.5 sm:w-27.5 lg:h-32.5 lg:w-32.5"
                        />
                        <SectionEyebrow center>{t("contactEyebrow")}</SectionEyebrow>
                        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                            {t("contactTitle")}
                        </h2>
                        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
                            {t("contactSubtitle")}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            {settings.contactEmail && (
                                <Button asChild size="lg" variant="accent">
                                    <a href={`mailto:${settings.contactEmail}`}>
                                        {settings.contactEmail}
                                    </a>
                                </Button>
                            )}
                            {settings.phone && (
                                <Button asChild size="lg" variant="outline">
                                    <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

function HeroStat({
    value,
    label,
    bordered = false,
}: {
    value: string;
    label: string;
    bordered?: boolean;
}) {
    return (
        <div className={bordered ? "border-l border-border pl-4 sm:pl-8" : ""}>
            <div className="font-display text-2xl text-primary sm:text-3xl">
                {value}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground sm:text-xs">
                {label}
            </div>
        </div>
    );
}

function TrustCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-[26px] border border-border bg-card p-5 transition-all hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,.2)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600/10 text-orange-600">
                {icon}
            </span>
            <p className="mt-4 font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
            </p>
        </div>
    );
}
