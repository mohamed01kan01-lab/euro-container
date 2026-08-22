import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RatingStars } from "./rating-stars";
import { ReviewForm } from "./review-form";

interface ReviewsSectionProps {
    productId: string;
    productSlug: string;
}

export async function ReviewsSection({
    productId,
    productSlug,
}: ReviewsSectionProps) {
    const session = await auth.api.getSession({ headers: await headers() });

    const [reviews, distribution, existing] = await Promise.all([
        // Seuls les avis approuvés sont publics.
        prisma.productReview.findMany({
            where: { productId, status: "APPROVED" },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        prisma.productReview.groupBy({
            by: ["rating"],
            where: { productId, status: "APPROVED" },
            _count: { rating: true },
        }),
        session
            ? prisma.productReview.findFirst({
                  where: { productId, userId: session.user.id },
                  select: { id: true },
              })
            : null,
    ]);

    const total = distribution.reduce((sum, d) => sum + d._count.rating, 0);
    const average =
        total === 0
            ? 0
            : distribution.reduce((sum, d) => sum + d.rating * d._count.rating, 0) /
              total;

    const byRating = (rating: number) =>
        distribution.find((d) => d.rating === rating)?._count.rating ?? 0;

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">
                Avis clients
            </h2>

            {total > 0 && (
                <div className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:gap-10">
                    <div className="text-center sm:text-left">
                        <p className="text-4xl font-bold">
                            {average.toFixed(1)}
                        </p>
                        <RatingStars
                            value={average}
                            size={16}
                            className="mt-1.5"
                        />
                        <p className="mt-1 text-sm text-muted-foreground">
                            {total} avis
                        </p>
                    </div>

                    <ul className="space-y-1.5">
                        {[5, 4, 3, 2, 1].map((rating) => {
                            const count = byRating(rating);
                            const percent = total ? (count / total) * 100 : 0;
                            return (
                                <li
                                    key={rating}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <span className="w-8 shrink-0 text-muted-foreground">
                                        {rating} ★
                                    </span>
                                    <span
                                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                                        role="img"
                                        aria-label={`${count} avis à ${rating} étoiles`}
                                    >
                                        <span
                                            className="block h-full rounded-full bg-primary"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </span>
                                    <span className="w-8 shrink-0 text-right text-muted-foreground">
                                        {count}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <ReviewForm
                productId={productId}
                productSlug={productSlug}
                isAuthenticated={!!session}
                alreadyReviewed={!!existing}
            />

            {reviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucun avis pour le moment. Soyez le premier à donner le
                    vôtre.
                </p>
            ) : (
                <ul className="space-y-4">
                    {reviews.map((review) => (
                        <li
                            key={review.id}
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <article className="space-y-2">
                                <header className="flex items-center gap-2.5">
                                    {review.user.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={review.user.image}
                                            alt=""
                                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                            aria-hidden
                                        >
                                            {review.user.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">
                                            {review.user.name}
                                        </p>
                                        <time
                                            dateTime={review.createdAt.toISOString()}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {new Intl.DateTimeFormat("fr-FR", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            }).format(review.createdAt)}
                                        </time>
                                    </div>
                                    <RatingStars
                                        value={review.rating}
                                        className="ml-auto"
                                    />
                                </header>

                                {review.comment && (
                                    <p className="whitespace-pre-line text-sm leading-relaxed">
                                        {review.comment}
                                    </p>
                                )}
                            </article>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
