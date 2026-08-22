import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { IconChevronRight } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { PostCard, type PostCardData } from "@/components/public/post-card";
import { CommentsSection } from "@/components/public/comments-section";
import { Badge } from "@/components/ui/badge";

export const revalidate = 300;

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
    return prisma.post.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
            author: { select: { name: true, image: true } },
            categories: {
                include: {
                    category: { select: { id: true, name: true, slug: true } },
                },
            },
            tags: {
                include: { tag: { select: { id: true, name: true } } },
            },
        },
    });
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const [post, settings] = await Promise.all([
        getPost(slug),
        getSiteSettings(),
    ]);
    if (!post) return {};

    return {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        robots: { index: true, follow: true },
        openGraph: {
            title: post.seoTitle || post.title,
            description: post.seoDescription || post.excerpt || undefined,
            type: "article",
            publishedTime: post.publishedAt?.toISOString(),
            authors: [post.author.name],
            siteName: settings.siteName,
            ...(post.featuredImage && { images: [{ url: post.featuredImage }] }),
        },
    };
}

/** Estimation de lecture : 200 mots/minute sur le contenu dépouillé du HTML. */
function readingTime(html: string | null): number {
    if (!html) return 1;
    const words = html
        .replace(/<[^>]*>/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export default async function PostPage({ params }: PageProps) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    const firstCategory = post.categories[0]?.category;

    const related = await prisma.post.findMany({
        where: {
            status: "PUBLISHED",
            id: { not: post.id },
            ...(firstCategory && {
                categories: { some: { categoryId: firstCategory.id } },
            }),
        },
        include: {
            author: { select: { name: true, image: true } },
            categories: {
                include: { category: { select: { name: true, slug: true } } },
            },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
    });

    const relatedSerialized: PostCardData[] = related.map((p) => ({
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

    const publishedDate = post.publishedAt
        ? new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
          }).format(post.publishedAt)
        : null;

    const minutes = readingTime(post.content);

    return (
        <article>
            {/* En-tête */}
            <header className="border-b border-border bg-linear-to-b from-muted/50 to-background">
                <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
                    <nav
                        aria-label="Fil d'Ariane"
                        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
                    >
                        <Link
                            href="/blog"
                            className="transition-colors hover:text-foreground"
                        >
                            Blog
                        </Link>
                        {firstCategory && (
                            <>
                                <IconChevronRight size={14} aria-hidden />
                                <Link
                                    href={`/blog?category=${firstCategory.slug}`}
                                    className="transition-colors hover:text-foreground"
                                >
                                    {firstCategory.name}
                                </Link>
                            </>
                        )}
                    </nav>

                    {post.categories.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {post.categories.map(({ category }) => (
                                <Link
                                    key={category.id}
                                    href={`/blog?category=${category.slug}`}
                                    className="text-[11px] font-medium uppercase tracking-wider text-primary transition-opacity hover:opacity-70"
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                        {post.title}
                    </h1>

                    {post.excerpt && (
                        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                            {post.excerpt}
                        </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {post.author.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={post.author.image}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                                aria-hidden
                            >
                                {post.author.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="font-medium text-foreground">
                            {post.author.name}
                        </span>
                        {publishedDate && (
                            <>
                                <span aria-hidden>·</span>
                                <time
                                    dateTime={post.publishedAt?.toISOString()}
                                >
                                    {publishedDate}
                                </time>
                            </>
                        )}
                        <span aria-hidden>·</span>
                        <span>{minutes} min de lecture</span>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-4 py-10">
                {post.featuredImage && (
                    <figure className="-mt-4 mb-10 overflow-hidden rounded-xl border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="aspect-video w-full object-cover"
                        />
                    </figure>
                )}

                <div
                    className="prose prose-lg max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
                />

                {post.tags.length > 0 && (
                    <footer className="mt-10 border-t border-border pt-6">
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(({ tag }) => (
                                <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="rounded-full font-normal"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </footer>
                )}

                <div className="mt-12 border-t border-border pt-10">
                    <CommentsSection postId={post.id} />
                </div>
            </div>

            {relatedSerialized.length > 0 && (
                <aside className="border-t border-border bg-muted/30">
                    <div className="mx-auto max-w-5xl px-4 py-12">
                        <h2 className="mb-6 text-xl font-semibold tracking-tight">
                            Articles similaires
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {relatedSerialized.map((p) => (
                                <PostCard key={p.slug} post={p} />
                            ))}
                        </div>
                    </div>
                </aside>
            )}
        </article>
    );
}
