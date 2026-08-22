"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconUser, IconMail, IconLock, IconLoader2, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage, getThrownErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

const schema = z.object({
    name: z.string().min(2, { message: "Au moins 2 caractères" }).trim(),
    email: z.email({ error: "Email invalide" }),
    password: z
        .string()
        .min(8, { message: "8 caractères minimum" })
        .regex(/[a-zA-Z]/, { message: "Au moins une lettre" })
        .regex(/[0-9]/, { message: "Au moins un chiffre" }),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);

        try {
            const { error } = await authClient.signUp.email({
                name: values.name,
                email: values.email,
                password: values.password,
            });

            if (error) {
                const message = getAuthErrorMessage(error);
                setServerError(message);
                toast.error(message);
                return;
            }

            toast.success(
                `Compte créé ! Un code de vérification a été envoyé à ${values.email}.`,
            );
            router.push(
                `/verify-email?email=${encodeURIComponent(values.email)}`,
            );
        } catch (err) {
            const message = getThrownErrorMessage(err);
            setServerError(message);
            toast.error(message);
        }
    };

    return (
        <section className="w-full bg-card rounded-2xl shadow-md p-6">
            <header className="mb-6">
                <h1 className="text-xl font-semibold">Créer un compte</h1>
                <p className="text-sm text-muted-foreground mt-1">Rejoignez NextPress gratuitement</p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
                {serverError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                        {serverError}
                    </p>
                )}

                <div className="space-y-1.5">
                    <Label htmlFor="name">Nom</Label>
                    <div className="relative">
                        <IconUser size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="name"
                            placeholder="Jean Dupont"
                            className="pl-9"
                            autoComplete="off"
                            {...register("name")}
                        />
                    </div>
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="vous@exemple.com"
                            className="pl-9"
                            autoComplete="off"
                            {...register("email")}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password">Mot de passe</Label>
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

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                    {isSubmitting && <IconLoader2 size={16} className="mr-2 animate-spin" />}
                    Créer mon compte
                </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
                Déjà un compte ?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                    Se connecter
                </Link>
            </p>
        </section>
    );
}
