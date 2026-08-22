import { Link } from "@/i18n/routing";

const CUT_CORNER =
    "[clip-path:polygon(0_0,calc(100%-1rem)_0,100%_1rem,100%_100%,0_100%)]";

export interface PostCardData {
    slug: string;
    title: string;
    excerpt: string | null;
    featuredImage: string | null;
    publishedAt: string | null;
    author: { name: string; image: string | null };
    categories: { category: { name: string; slug: string } }[];
}

export function PostCard({ post }: { post: PostCardData }) {
    const mainCategory = post.categories[0]?.category;
    const date = post.publishedAt
        ? new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
          }).format(new Date(post.publishedAt))
        : null;

    return (
        <article
            className={`group relative flex flex-col rounded-none border-2 border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:-translate-y-1 focus-within:border-primary/40 ${CUT_CORNER}`}
        >
            <div className="aspect-video overflow-hidden bg-muted">
                {post.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="h-full w-full bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2.5 p-5">
                {mainCategory && (
                    <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                        {mainCategory.name}
                    </p>
                )}

                <h2 className="text-base font-semibold leading-snug line-clamp-2">
                    {/* Lien étendu à toute la carte : une seule cible cliquable
                        et un seul arrêt au clavier. */}
                    <Link
                        href={`/blog/${post.slug}`}
                        className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
                    >
                        {post.title}
                    </Link>
                </h2>

                {post.excerpt && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {post.excerpt}
                    </p>
                )}

                <footer className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                    {post.author.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={post.author.image}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                        />
                    ) : (
                        <span
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                            aria-hidden
                        >
                            {post.author.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <span className="text-xs font-medium">
                        {post.author.name}
                    </span>
                    {date && (
                        <>
                            <span className="text-xs text-muted-foreground" aria-hidden>
                                ·
                            </span>
                            <time
                                className="text-xs text-muted-foreground"
                                dateTime={post.publishedAt ?? undefined}
                            >
                                {date}
                            </time>
                        </>
                    )}
                </footer>
            </div>
        </article>
    );
}
