import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentForm } from "./comment-form";
import { CommentsList, type PublicComment } from "./comments-list";

interface CommentsSectionProps {
    postId: string;
}

export async function CommentsSection({ postId }: CommentsSectionProps) {
    const [session, roots] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        // Seuls les commentaires approuvés sont publics : le filtre de statut
        // porte aussi sur les réponses.
        prisma.comment.findMany({
            where: { postId, status: "APPROVED", parentId: null },
            include: {
                user: { select: { name: true, image: true } },
                replies: {
                    where: { status: "APPROVED" },
                    include: { user: { select: { name: true, image: true } } },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
    ]);

    const comments: PublicComment[] = roots.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        authorName: c.user?.name ?? c.guestName ?? "Anonyme",
        authorImage: c.user?.image ?? null,
        replies: c.replies.map((r) => ({
            id: r.id,
            content: r.content,
            createdAt: r.createdAt.toISOString(),
            authorName: r.user?.name ?? r.guestName ?? "Anonyme",
            authorImage: r.user?.image ?? null,
        })),
    }));

    const total = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">
                {total > 0
                    ? `${total} commentaire${total > 1 ? "s" : ""}`
                    : "Commentaires"}
            </h2>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <CommentForm
                    postId={postId}
                    currentUserName={session?.user.name}
                />
            </div>

            <CommentsList
                postId={postId}
                comments={comments}
                currentUserName={session?.user.name}
            />
        </section>
    );
}
