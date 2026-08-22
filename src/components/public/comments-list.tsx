"use client";

import { useState } from "react";
import { IconMessageReply, IconCornerDownRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { CommentForm } from "./comment-form";

export interface PublicComment {
    id: string;
    content: string;
    /** ISO : les Date ne traversent pas la frontière serveur telles quelles. */
    createdAt: string;
    authorName: string;
    authorImage: string | null;
    replies: {
        id: string;
        content: string;
        createdAt: string;
        authorName: string;
        authorImage: string | null;
    }[];
}

function formatDate(iso: string) {
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(iso));
}

function Avatar({ name, image }: { name: string; image: string | null }) {
    if (image) {
        // eslint-disable-next-line @next/next/no-img-element
        return (
            <img
                src={image}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
        );
    }
    return (
        <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
            aria-hidden
        >
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

interface CommentsListProps {
    postId: string;
    comments: PublicComment[];
    currentUserName?: string;
}

export function CommentsList({
    postId,
    comments,
    currentUserName,
}: CommentsListProps) {
    const [replyTo, setReplyTo] = useState<string | null>(null);

    if (comments.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun commentaire pour le moment. Lancez la discussion.
            </p>
        );
    }

    return (
        <ul className="space-y-6">
            {comments.map((comment) => (
                <li
                    key={comment.id}
                    className="rounded-xl border border-border bg-card p-4"
                >
                    <article className="space-y-2">
                        <header className="flex items-center gap-2.5">
                            <Avatar
                                name={comment.authorName}
                                image={comment.authorImage}
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-medium">
                                    {comment.authorName}
                                </p>
                                <time
                                    dateTime={comment.createdAt}
                                    className="text-xs text-muted-foreground"
                                >
                                    {formatDate(comment.createdAt)}
                                </time>
                            </div>
                        </header>

                        <p className="whitespace-pre-line text-sm leading-relaxed">
                            {comment.content}
                        </p>

                        {/* Un seul niveau : pas de bouton « répondre » sur les réponses. */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() =>
                                setReplyTo(
                                    replyTo === comment.id ? null : comment.id,
                                )
                            }
                        >
                            <IconMessageReply size={13} className="mr-1.5" />
                            Répondre
                        </Button>
                    </article>

                    {replyTo === comment.id && (
                        <div className="mt-3 border-t border-border pt-3">
                            <CommentForm
                                postId={postId}
                                parentId={comment.id}
                                currentUserName={currentUserName}
                                compact
                                onDone={() => setReplyTo(null)}
                            />
                        </div>
                    )}

                    {comment.replies.length > 0 && (
                        <ul className="mt-4 space-y-4 border-l-2 border-border pl-4">
                            {comment.replies.map((reply) => (
                                <li key={reply.id}>
                                    <article className="space-y-1.5">
                                        <header className="flex items-center gap-2">
                                            <IconCornerDownRight
                                                size={13}
                                                className="shrink-0 text-muted-foreground"
                                                aria-hidden
                                            />
                                            <Avatar
                                                name={reply.authorName}
                                                image={reply.authorImage}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {reply.authorName}
                                                </p>
                                                <time
                                                    dateTime={reply.createdAt}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    {formatDate(reply.createdAt)}
                                                </time>
                                            </div>
                                        </header>
                                        <p className="whitespace-pre-line pl-7 text-sm leading-relaxed">
                                            {reply.content}
                                        </p>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
}
