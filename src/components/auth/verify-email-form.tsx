"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconMailCheck, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage, getThrownErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

const schema = z.object({
    otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
});
type FormValues = z.infer<typeof schema>;

export function VerifyEmailForm() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const [serverError, setServerError] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const { handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { otp: "" },
    });
    const otp = watch("otp");

    const onSubmit = async (values: FormValues) => {
        setServerError(null);

        try {
            const { error } = await authClient.emailOtp.verifyEmail({
                email,
                otp: values.otp,
            });

            if (error) {
                const message = getAuthErrorMessage(error);
                setServerError(message);
                toast.error(message);
                return;
            }

            toast.success("Email vérifié ! Bienvenue sur NextPress.");
            // Navigation « dure » : voir le commentaire dans login-form.tsx.
            window.location.assign("/dashboard");
        } catch (err) {
            const message = getThrownErrorMessage(err);
            setServerError(message);
            toast.error(message);
        }
    };

    const resendCode = async () => {
        setServerError(null);
        setResending(true);

        try {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification",
            });

            if (error) {
                const message = getAuthErrorMessage(error);
                setServerError(message);
                toast.error(message);
                return;
            }

            setCooldown(60);
            toast.success(`Nouveau code envoyé à ${email}.`);
        } catch (err) {
            const message = getThrownErrorMessage(err);
            setServerError(message);
            toast.error(message);
        } finally {
            setResending(false);
        }
    };

    return (
        <section className="w-full bg-card rounded-2xl shadow-md p-6">
            <header className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <IconMailCheck size={24} className="text-primary" />
                </div>
                <h1 className="text-xl font-semibold">Vérifiez votre email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Nous avons envoyé un code à 6 chiffres à{" "}
                    <strong className="font-medium text-foreground">{email}</strong>
                </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">
                        {serverError}
                    </p>
                )}

                <div className="flex flex-col items-center gap-2">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(val) => setValue("otp", val)}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                    {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || otp.length < 6}>
                    {isSubmitting && <IconLoader2 size={16} className="mr-2 animate-spin" />}
                    Vérifier
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={resending || cooldown > 0}
                    onClick={resendCode}
                >
                    {resending ? (
                        <IconLoader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                        <IconRefresh size={14} className="mr-1.5" />
                    )}
                    {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
                </Button>
            </form>
        </section>
    );
}
