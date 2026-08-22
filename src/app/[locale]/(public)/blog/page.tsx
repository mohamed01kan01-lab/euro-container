import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import {
    IconChevronLeft,
    IconChevronRight,
    IconArticleOff,
} from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { PostCard, type PostCardData } from "@/components/public/post-card";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

const PER_PAGE = 9;

interface PageProps {
    searchParams: Promise<{ category?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    return {
        title: `Blog — ${settings.siteName}`,
        description: settings.seoDescription || settings.description || undefined,
        robots: { index: true, follow: true },
    };
}

export default async function BlogPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? "1", 10));
    const categorySlug = params.category ?? "";

    const [settings, categories, rawPosts, total] = await Promise.all([
        getSiteSettings(),
        prisma.postCategory.findMany({
            select: { id: true, name: true, slug: true },
            orderBy: { name: "asc" },
        }),
        prisma.post.findMany({
            where: {
                status: "PUBLISHED",
                ...(categorySlug && {
                    categories: { some: { category: { slug: categorySlug } } },
                }),
            },
            include: {
                author: { select: { name: true, image: true } },
                categories: {
                    include: { category: { select: { name: true, slug: true } } },
                },
            },
            orderBy: { publishedAt: "desc" },
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE + 1,
        }),
        prisma.post.count({
            where: {
                status: "PUBLISHED",
                ...(categorySlug && {
                    categories: { some: { category: { slug: categorySlug } } },
                }),
            },
        }),
    ]);

    const hasNext = rawPosts.length > PER_PAGE;
    const hasPrev = page > 1;
    const posts = rawPosts.slice(0, PER_PAGE);

    const serialized: PostCardData[] = posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        featuredImage: p.featuredImage,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        author: { name: p.author.name, image: p.author.image },
        categories: p.categories.map((c) => ({
            category: { name: c.category.name, slug: c.category.slug },
        })),
    }));

    const activeCategory = categories.find((c) => c.slug === categorySlug);

    function pageUrl(p: number, cat?: string) {
        const qs = new URLSearchParams();
        if (cat) qs.set("category", cat);
        if (p > 1) qs.set("page", String(p));
        return `/blog${qs.size ? "?" + qs.toString() : ""}`;
    }

    return (
        <>
            {/* Hero */}
            <section className="border-b border-border bg-linear-to-b from-muted/50 to-background">
                <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {activeCategory ? activeCategory.name : "Blog"}
                    </h1>
                    <p className="mt-3 max-w-xl text-muted-foreground">
                        {activeCategory
                            ? `${total} article${total !== 1 ? "s" : ""} dans cette catégorie.`
                            : (settings.description ??
                              `${total} article${total !== 1 ? "s" : ""} à découvrir.`)}
                    </p>
                </div>
            </section>

            {/* Filtres, collants sous le header du layout public */}
            {categories.length > 0 && (
                <div className="sticky top-14 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
                    <nav
                        aria-label="Filtrer par catégorie"
                        className="mx-auto -mb-px flex max-w-5xl gap-1.5 overflow-x-auto px-4 py-3"
                    >
                        <FilterPill href="/blog" active={!categorySlug}>
                            Tous
                        </FilterPill>
                        {categories.map((cat) => (
                            <FilterPill
                                key={cat.id}
                                href={pageUrl(1, cat.slug)}
                                active={categorySlug === cat.slug}
                            >
                                {cat.name}
                            </FilterPill>
                        ))}
                    </nav>
                </div>
            )}

            <section className="mx-auto max-w-5xl space-y-10 px-4 py-10">
                {serialized.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <IconArticleOff
                                size={24}
                                className="text-muted-foreground"
                            />
                        </span>
                        <div className="space-y-1">
                            <p className="font-medium">
                                Aucun article
                                {categorySlug ? " dans cette catégorie" : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Revenez bientôt, de nouveaux articles arrivent.
                            </p>
                        </div>
                        {categorySlug && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/blog">Voir tous les articles</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {serialized.map((post) => (
                            <PostCard key={post.slug} post={post} />
                        ))}
                    </div>
                )}

                {(hasPrev || hasNext) && (
                    <nav
                        aria-label="Pagination des articles"
                        className="flex items-center justify-between border-t border-border pt-6"
                    >
                        {hasPrev ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={pageUrl(
                                        page - 1,
                                        categorySlug || undefined,
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
                    ? "whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors"
                    : "whitespace-nowrap rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            }
        >
            {children}
        </Link>
    );
}
