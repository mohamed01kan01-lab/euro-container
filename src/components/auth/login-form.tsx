"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    IconMail,
    IconLock,
    IconLoader2,
    IconEye,
    IconEyeOff,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage, getThrownErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

const schema = z.object({
    email: z.email({ error: "Email invalide" }),
    password: z.string().min(1, { message: "Mot de passe requis" }),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const raw = searchParams.get("callbackUrl") ?? "/dashboard";
    const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);

        try {
            const { error } = await authClient.signIn.email({
                email: values.email,
                password: values.password,
            });

            if (error) {
                if (error.code === "EMAIL_NOT_VERIFIED") {
                    // Le sign-in n'envoie pas de code de lui-même (sendOnSignIn
                    // n'est pas activé) : on le demande ici pour que le code soit
                    // frais — il n'est valable que 5 minutes.
                    await authClient.emailOtp.sendVerificationOtp({
                        email: values.email,
                        type: "email-verification",
                    });
                    toast.info(
                        "Votre email n'est pas encore vérifié. Nous vous envoyons un code.",
                    );
                    router.push(
                        `/verify-email?email=${encodeURIComponent(values.email)}`,
                    );
                    return;
                }
                const message = getAuthErrorMessage(error);
                setServerError(message);
                toast.error(message);
                return;
            }

            toast.success("Connexion réussie ! Redirection en cours…");
            // Navigation « dure » volontaire : le Router Cache de Next peut avoir
            // mémorisé la redirection vers /login émise par le layout admin quand
            // la session n'existait pas encore. Un rechargement complet renvoie la
            // requête au serveur avec le cookie de session fraîchement posé.
            window.location.assign(callbackUrl);
        } catch (err) {
            const message = getThrownErrorMessage(err);
            setServerError(message);
            toast.error(message);
        }
    };

    return (
        <section className="w-full bg-card rounded-2xl shadow-md p-6">
            <header className="mb-6">
                <h1 className="text-xl font-semibold">Connexion</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Accédez à votre espace NextPress
                </p>
            </header>

            <form
                onSubmit={handleSubmit(onSubmit)}
                autoComplete="off"
                className="space-y-4"
            >
                {serverError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                        {serverError}
                    </p>
                )}

                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <IconMail
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="email"
                            type="email"
                            placeholder="vous@exemple.com"
                            className="pl-9"
                            autoComplete="off"
                            {...register("email")}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-xs text-destructive">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Link
                            href="/forgot-password"
                            className="text-xs text-primary hover:underline"
                        >
                            Mot de passe oublié ?
                        </Link>
                    </div>
                    <div className="relative">
                        <IconLock
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
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
                            aria-label={
                                showPassword
                                    ? "Masquer le mot de passe"
                                    : "Afficher le mot de passe"
                            }
                        >
                            {showPassword ? (
                                <IconEyeOff size={16} />
                            ) : (
                                <IconEye size={16} />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-xs text-destructive">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting && (
                        <IconLoader2 size={16} className="mr-2 animate-spin" />
                    )}
                    Se connecter
                </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
                Pas encore de compte ?{" "}
                <Link
                    href="/signup"
                    className="text-primary hover:underline font-medium"
                >
                    S&apos;inscrire
                </Link>
            </p>
        </section>
    );
}
