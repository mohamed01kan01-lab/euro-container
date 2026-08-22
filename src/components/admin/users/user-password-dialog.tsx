"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconEye, IconEyeOff } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setUserPassword } from "@/app/(admin)/dashboard/users/actions";

const schema = z.object({
    password: z
        .string()
        .min(8, { message: "8 caractères minimum" })
        .regex(/[a-zA-Z]/, { message: "Au moins une lettre" })
        .regex(/[0-9]/, { message: "Au moins un chiffre" }),
});
type FormValues = z.infer<typeof schema>;

interface UserPasswordDialogProps {
    user: { id: string; name: string } | null;
    onClose: () => void;
}

export function UserPasswordDialog({ user, onClose }: UserPasswordDialogProps) {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        if (!user) return;
        try {
            await setUserPassword(user.id, values.password);
            toast.success(`Mot de passe de ${user.name} réinitialisé.`);
            reset();
            onClose();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Impossible de réinitialiser le mot de passe.",
            );
        }
    };

    return (
        <Dialog
            open={!!user}
            onOpenChange={(o) => {
                if (!o) {
                    reset();
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                    <DialogDescription>
                        Nouveau mot de passe pour {user?.name}. Aucun email n'est
                        envoyé : transmettez-le vous-même.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    autoComplete="off"
                    className="space-y-4"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="new-password">Nouveau mot de passe</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
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
                            onClick={onClose}
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
                            Réinitialiser
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
