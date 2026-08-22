"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitComment } from "@/app/[locale]/(public)/actions";

const schema = z.object({
    content: z
        .string()
        .min(2, { message: "Votre commentaire est trop court" })
        .trim(),
    guestName: z.string().optional(),
    guestEmail: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface CommentFormProps {
    postId: string;
    /** Absent = visiteur non connecté : nom et email deviennent obligatoires. */
    currentUserName?: string;
    parentId?: string;
    onDone?: () => void;
    compact?: boolean;
}

export function CommentForm({
    postId,
    currentUserName,
    parentId,
    onDone,
    compact = false,
}: CommentFormProps) {
    const [sent, setSent] = useState(false);
    const isGuest = !currentUserName;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        try {
            await submitComment({
                postId,
                parentId: parentId ?? null,
                content: values.content,
                guestName: values.guestName,
                guestEmail: values.guestEmail,
            });
            reset();
            setSent(true);
            onDone?.();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "L'envoi a échoué.",
            );
        }
    };

    // Le commentaire n'apparaît pas immédiatement : sans ce message, l'envoi
    // réussi passerait pour un échec.
    if (sent) {
        return (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>
                    Merci ! Votre commentaire a bien été envoyé et sera publié
                    après validation par un modérateur.
                </span>
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {isGuest && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor={`name-${parentId ?? "root"}`}>Nom</Label>
                        <Input
                            id={`name-${parentId ?? "root"}`}
                            placeholder="Votre nom"
                            {...register("guestName")}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={`email-${parentId ?? "root"}`}>
                            Email
                        </Label>
                        <Input
                            id={`email-${parentId ?? "root"}`}
                            type="email"
                            placeholder="vous@exemple.com"
                            {...register("guestEmail")}
                        />
                        <p className="text-xs text-muted-foreground">
                            Non publié.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                {!compact && (
                    <Label htmlFor={`content-${parentId ?? "root"}`}>
                        {currentUserName
                            ? `Commenter en tant que ${currentUserName}`
                            : "Votre commentaire"}
                    </Label>
                )}
                <Textarea
                    id={`content-${parentId ?? "root"}`}
                    rows={compact ? 3 : 4}
                    placeholder={
                        parentId
                            ? "Votre réponse…"
                            : "Partagez votre avis sur cet article…"
                    }
                    className="resize-none"
                    {...register("content")}
                />
                {errors.content && (
                    <p className="text-xs text-destructive">
                        {errors.content.message}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting && (
                        <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                    )}
                    {parentId ? "Répondre" : "Publier"}
                </Button>
                {parentId && onDone && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onDone}
                        disabled={isSubmitting}
                    >
                        Annuler
                    </Button>
                )}
            </div>
        </form>
    );
}
