"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    IconPlus,
    IconLoader2,
    IconEye,
    IconEyeOff,
    IconRefresh,
} from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { ROLE_LABELS, ROLE_VALUES } from "@/lib/roles";
import { createUser } from "@/app/(admin)/dashboard/users/actions";

const schema = z.object({
    name: z.string().min(2, { message: "Au moins 2 caractères" }).trim(),
    email: z.email({ error: "Email invalide" }),
    password: z
        .string()
        .min(8, { message: "8 caractères minimum" })
        .regex(/[a-zA-Z]/, { message: "Au moins une lettre" })
        .regex(/[0-9]/, { message: "Au moins un chiffre" }),
    role: z.enum(["ADMIN", "EDITOR", "CLIENT"]),
});
type FormValues = z.infer<typeof schema>;

/** Mot de passe temporaire lisible, transmis par email à la personne. */
function generatePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function UserCreateDialog() {
    const [open, setOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { role: "CLIENT" },
    });

    const role = watch("role");

    // Un seul point de réinitialisation : « Annuler » appelle setOpen(false)
    // directement, ce qui ne déclenche pas onOpenChange de Radix. Réagir à la
    // fermeture couvre tous les chemins (annulation, Échap, clic extérieur,
    // succès, échec).
    useEffect(() => {
        if (!open) {
            reset({ name: "", email: "", password: "", role: "CLIENT" });
            setShowPassword(false);
        }
    }, [open, reset]);

    const onSubmit = async (values: FormValues) => {
        try {
            const result = await createUser(values);

            if (result.warning) {
                toast.warning(result.warning);
            } else {
                toast.success(
                    `Compte créé. Les identifiants ont été envoyés à ${values.email}.`,
                );
            }

            setOpen(false);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Impossible de créer l'utilisateur.",
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <IconPlus size={16} className="mr-2" />
                    Nouvel utilisateur
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nouvel utilisateur</DialogTitle>
                    <DialogDescription>
                        La personne recevra ses identifiants et un lien de
                        connexion par email.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    autoComplete="off"
                    className="space-y-4"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="user-name">Nom</Label>
                        <Input
                            id="user-name"
                            placeholder="Jean Dupont"
                            autoComplete="off"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            type="email"
                            placeholder="jean@exemple.com"
                            autoComplete="off"
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="user-role">Rôle</Label>
                        <Select
                            value={role}
                            onValueChange={(v) => setValue("role", v as Role)}
                        >
                            <SelectTrigger id="user-role" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_VALUES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {ROLE_LABELS[r]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="user-password">Mot de passe</Label>
                            <button
                                type="button"
                                onClick={() =>
                                    setValue("password", generatePassword(), {
                                        shouldValidate: true,
                                    })
                                }
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                                <IconRefresh size={12} />
                                Générer
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                id="user-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10"
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

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && (
                                <IconLoader2
                                    size={16}
                                    className="mr-2 animate-spin"
                                />
                            )}
                            Créer le compte
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
