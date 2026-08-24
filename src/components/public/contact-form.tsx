"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/public/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitContactMessage } from "@/app/[locale]/(public)/actions";

const schema = z.object({
    name: z.string().trim().min(2, { message: "Indiquez votre nom." }),
    email: z.email({ error: "Adresse email invalide." }),
    subject: z.string().trim().optional(),
    message: z
        .string()
        .trim()
        .min(10, { message: "Votre message est trop court." })
        .max(5000, { message: "Votre message est trop long." }),
});
type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
    title: string;
    nameLabel: string;
    emailLabel: string;
    subjectLabel: string;
    messageLabel: string;
    submitLabel: string;
    successTitle: string;
    successBody: string;
    errorGeneric: string;
}

export function ContactForm({
    title,
    nameLabel,
    emailLabel,
    subjectLabel,
    messageLabel,
    submitLabel,
    successTitle,
    successBody,
    errorGeneric,
}: ContactFormProps) {
    const [sent, setSent] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        try {
            await submitContactMessage(values);
            reset();
            setSent(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : errorGeneric);
        }
    };

    if (sent) {
        return (
            <div className="flex items-start gap-3 rounded-[24px] border border-border bg-card p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconCheck size={18} />
                </span>
                <div>
                    <p className="font-semibold">{successTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {successBody}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-[24px] border border-border bg-card p-6"
        >
            <h2 className="font-display text-xl tracking-tight">{title}</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="contact-name">{nameLabel}</Label>
                    <Input id="contact-name" {...register("name")} />
                    {errors.name && (
                        <p className="text-xs text-destructive">
                            {errors.name.message}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="contact-email">{emailLabel}</Label>
                    <Input
                        id="contact-email"
                        type="email"
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-xs text-destructive">
                            {errors.email.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-4 space-y-1.5">
                <Label htmlFor="contact-subject">{subjectLabel}</Label>
                <Input id="contact-subject" {...register("subject")} />
            </div>

            <div className="mt-4 space-y-1.5">
                <Label htmlFor="contact-message">{messageLabel}</Label>
                <Textarea
                    id="contact-message"
                    rows={5}
                    className="resize-none"
                    {...register("message")}
                />
                {errors.message && (
                    <p className="text-xs text-destructive">
                        {errors.message.message}
                    </p>
                )}
            </div>

            <Button type="submit" className="mt-5" disabled={isSubmitting}>
                {isSubmitting && (
                    <IconLoader2 size={16} className="mr-2 animate-spin" />
                )}
                {submitLabel}
            </Button>
        </form>
    );
}
