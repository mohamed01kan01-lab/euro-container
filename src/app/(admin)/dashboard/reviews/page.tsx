import type { Metadata } from "next";
import type { ReviewStatus } from "@prisma/client";
import { getReviews, getReviewStats } from "./actions";
import { ReviewsTable } from "@/components/admin/reviews/reviews-table";
import { RatingFilter } from "@/components/admin/reviews/reviews-filters";
import { ModerationStatusFilter } from "@/components/admin/comments/comments-filters";
import { RatingStars } from "@/components/public/rating-stars";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Avis" };

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

interface PageProps {
    searchParams: Promise<{ status?: string; rating?: string }>;
}

export default async function ReviewsPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const status = STATUSES.includes(params.status as ReviewStatus)
        ? (params.status as ReviewStatus)
        : undefined;
    const parsedRating = Number(params.rating);
    const rating =
        Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5
            ? parsedRating
            : undefined;

    const [reviews, stats] = await Promise.all([
        getReviews({ status, rating }),
        getReviewStats(),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Avis produits"
                description={
                    stats.pending > 0
                        ? `${stats.pending} en attente de modération sur ${stats.total}.`
                        : `${stats.total} avis, rien en attente.`
                }
                actions={
                    stats.total > 0 ? (
                        <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
                            <p className="text-xs text-muted-foreground">
                                Note moyenne publiée
                            </p>
                            <p className="mt-0.5 flex items-center justify-end gap-2">
                                <span className="text-xl font-semibold">
                                    {stats.average.toFixed(1)}
                                </span>
                                <RatingStars value={stats.average} size={15} />
                            </p>
                        </div>
                    ) : undefined
                }
            />

            <ModerationStatusFilter extra={<RatingFilter />} />

            <TableCard>
                <ReviewsTable reviews={reviews} />
            </TableCard>
        </section>
    );
}
