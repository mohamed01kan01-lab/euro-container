"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    IconCheck,
    IconX,
    IconTrash,
    IconLoader2,
    IconExternalLink,
    IconStarOff,
} from "@tabler/icons-react";
import type { ReviewStatus } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import {
    StatusBadge,
    type StatusTone,
} from "@/components/admin/ui/status-badge";
import { toast } from "sonner";
import { RatingStars } from "@/components/public/rating-stars";
import {
    setReviewStatus,
    deleteReview,
    type ReviewRow,
} from "@/app/(admin)/dashboard/reviews/actions";

const STATUS_CONFIG: Record<ReviewStatus, { label: string; tone: StatusTone }> =
    {
        PENDING: { label: "En attente", tone: "warning" },
        APPROVED: { label: "Approuvé", tone: "success" },
        REJECTED: { label: "Rejeté", tone: "danger" },
    };

export function ReviewsTable({ reviews }: { reviews: ReviewRow[] }) {
    const [pending, startTransition] = useTransition();
    const [deleting, setDeleting] = useState<ReviewRow | null>(null);

    function moderate(review: ReviewRow, status: ReviewStatus) {
        startTransition(async () => {
            try {
                await setReviewStatus(review.id, status);
                toast.success(
                    status === "APPROVED"
                        ? "Avis approuvé et publié."
                        : "Avis rejeté.",
                );
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "L'action a échoué.",
                );
            }
        });
    }

    function handleDelete() {
        if (!deleting) return;
        const target = deleting;
        startTransition(async () => {
            try {
                await deleteReview(target.id);
                toast.success("Avis supprimé.");
                setDeleting(null);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La suppression a échoué.",
                );
            }
        });
    }

    if (reviews.length === 0) {
        return (
            <EmptyState
                icon={IconStarOff}
                title="Aucun avis"
                description="Aucun avis ne correspond à ces critères. Changez de filtre pour voir les autres statuts."
            />
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead className="w-28">Note</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-32" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reviews.map((review) => {
                        const cfg = STATUS_CONFIG[review.status];
                        return (
                            <TableRow key={review.id}>
                                <TableCell className="align-top">
                                    <Link
                                        href={`/product/${review.product.slug}`}
                                        target="_blank"
                                        className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary"
                                    >
                                        <span className="line-clamp-1 max-w-[10rem]">
                                            {review.product.name}
                                        </span>
                                        <IconExternalLink
                                            size={12}
                                            className="shrink-0 text-muted-foreground"
                                        />
                                    </Link>
                                </TableCell>

                                <TableCell className="align-top">
                                    <p className="text-sm">
                                        {review.authorName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {review.authorEmail}
                                    </p>
                                </TableCell>

                                <TableCell className="align-top">
                                    <RatingStars value={review.rating} />
                                </TableCell>

                                <TableCell className="max-w-sm align-top">
                                    {review.comment ? (
                                        <p className="line-clamp-3 whitespace-pre-line text-sm">
                                            {review.comment}
                                        </p>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            — note seule
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell className="align-top">
                                    <StatusBadge tone={cfg.tone}>
                                        {cfg.label}
                                    </StatusBadge>
                                </TableCell>

                                <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                                    {new Intl.DateTimeFormat("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    }).format(review.createdAt)}
                                </TableCell>

                                <TableCell className="align-top">
                                    <div className="flex justify-end">
                                        <RowActions
                                            label={`l'avis de ${review.authorName}`}
                                            disabled={pending}
                                        >
                                            {review.status !== "APPROVED" && (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        moderate(
                                                            review,
                                                            "APPROVED",
                                                        )
                                                    }
                                                >
                                                    <IconCheck
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Approuver
                                                </DropdownMenuItem>
                                            )}
                                            {review.status !== "REJECTED" && (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        moderate(
                                                            review,
                                                            "REJECTED",
                                                        )
                                                    }
                                                >
                                                    <IconX
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Rejeter
                                                </DropdownMenuItem>
                                            )}

                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    setDeleting(review)
                                                }
                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            >
                                                <IconTrash
                                                    size={14}
                                                    className="mr-2"
                                                />
                                                Supprimer
                                            </DropdownMenuItem>
                                        </RowActions>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <AlertDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Pour le masquer sans
                            le perdre, préférez le rejet. La suppression est le
                            seul moyen de permettre à l&apos;auteur de déposer un
                            nouvel avis sur ce produit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={pending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {pending && (
                                <IconLoader2
                                    size={14}
                                    className="mr-1.5 animate-spin"
                                />
                            )}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
