import type { Metadata } from "next";
import type { CommentStatus } from "@prisma/client";
import { getComments, getCommentCounts } from "./actions";
import { CommentsTable } from "@/components/admin/comments/comments-table";
import { ModerationStatusFilter } from "@/components/admin/comments/comments-filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Commentaires" };

const STATUSES: CommentStatus[] = ["PENDING", "APPROVED", "REJECTED"];

interface PageProps {
    searchParams: Promise<{ status?: string }>;
}

export default async function CommentsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = STATUSES.includes(params.status as CommentStatus)
        ? (params.status as CommentStatus)
        : undefined;

    const [comments, counts] = await Promise.all([
        getComments({ status }),
        getCommentCounts(),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Commentaires"
                description={
                    counts.pending > 0
                        ? `${counts.pending} en attente de modération sur ${counts.total}.`
                        : `${counts.total} commentaire${counts.total !== 1 ? "s" : ""}, rien en attente.`
                }
            />

            <ModerationStatusFilter />

            <TableCard>
                <CommentsTable comments={comments} />
            </TableCard>
        </section>
    );
}
