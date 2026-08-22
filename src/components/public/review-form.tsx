"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { IconLoader2, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitReview } from "@/app/[locale]/(public)/actions";
import { RatingInput } from "./rating-input";

interface ReviewFormProps {
    productId: string;
    productSlug: string;
    /** Absent = visiteur non connecté ; ProductReview exige un compte. */
    isAuthenticated: boolean;
    /** L'utilisateur a déjà un avis sur ce produit. */
    alreadyReviewed: boolean;
}

export function ReviewForm({
    productId,
    productSlug,
    isAuthenticated,
    alreadyReviewed,
}: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);

    if (!isAuthenticated) {
        return (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground">
                    Connectez-vous pour partager votre avis sur ce produit.
                </p>
                <Button size="sm" className="mt-3" asChild>
                    <Link
                        href={`/login?callbackUrl=${encodeURIComponent(`/product/${productSlug}`)}`}
                    >
                        Se connecter
                    </Link>
                </Button>
            </div>
        );
    }

    if (alreadyReviewed) {
        return (
            <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Vous avez déjà donné votre avis sur ce produit.
            </p>
        );
    }

    if (sent) {
        return (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>
                    Merci ! Votre avis sera publié après validation par un
                    modérateur.
                </span>
            </p>
        );
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (rating < 1) {
            toast.error("Choisissez une note de 1 à 5 étoiles.");
            return;
        }

        setPending(true);
        try {
            await submitReview({ productId, rating, comment });
            setSent(true);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "L'envoi a échoué.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5"
        >
            <div className="space-y-2">
                <Label>Votre note</Label>
                <RatingInput value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="review-comment">
                    Votre commentaire{" "}
                    <span className="font-normal text-muted-foreground">
                        (facultatif)
                    </span>
                </Label>
                <Textarea
                    id="review-comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Qu'avez-vous pensé de ce produit ?"
                    className="resize-none"
                />
            </div>

            <Button type="submit" size="sm" disabled={pending}>
                {pending && (
                    <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                )}
                Publier mon avis
            </Button>
        </form>
    );
}
