"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLock, IconLoader2, IconEye, IconEyeOff, IconShieldLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage, getThrownErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

const schema = z
    .object({
        otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
        password: z
            .string()
            .min(8, { message: "8 caractères minimum" })
            .regex(/[a-zA-Z]/, { message: "Au moins une lettre" })
            .regex(/[0-9]/, { message: "Au moins un chiffre" }),
        confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirm"],
    });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { otp: "", password: "", confirm: "" },
    });
    const otp = watch("otp");

    const onSubmit = async (values: FormValues) => {
        setServerError(null);

        try {
            const { error } = await authClient.emailOtp.resetPassword({
                email,
                otp: values.otp,
                password: values.password,
            });

            if (error) {
                const message = getAuthErrorMessage(error);
                setServerError(message);
                toast.error(message);
                return;
            }

            toast.success(
                "Mot de passe réinitialisé ! Vous pouvez vous reconnecter.",
            );
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err) {
            const message = getThrownErrorMessage(err);
            setServerError(message);
            toast.error(message);
        }
    };

    if (success) {
        return (
            <section className="w-full bg-card rounded-2xl shadow-md p-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <IconShieldLock size={24} className="text-primary" />
                </div>
                <p className="font-semibold text-lg">Mot de passe réinitialisé !</p>
                <p className="text-sm text-muted-foreground">Redirection vers la connexion…</p>
            </section>
        );
    }

    return (
        <section className="w-full bg-card rounded-2xl shadow-md p-6">
            <header className="mb-6">
                <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Entrez le code reçu par email et choisissez un nouveau mot de passe
                </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
                {serverError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                        {serverError}
                    </p>
                )}

                <div className="space-y-1.5">
                    <Label>Code de vérification</Label>
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

                <div className="space-y-1.5">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <div className="relative">
                        <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10"
                            autoComplete="new-password"
                            {...register("password")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <div className="relative">
                        <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="confirm"
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10"
                            autoComplete="new-password"
                            {...register("confirm")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                            {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                        </button>
                    </div>
                    {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting || otp.length < 6}>
                    {isSubmitting && <IconLoader2 size={16} className="mr-2 animate-spin" />}
                    Réinitialiser le mot de passe
                </Button>
            </form>
        </section>
    );
}
