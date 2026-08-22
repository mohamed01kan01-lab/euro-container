"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type {
    SerializedZone,
    ZoneInput,
} from "@/app/(admin)/dashboard/shipping/actions";

// freeAbove reste une chaîne dans le formulaire : z.coerce.number()
// transformerait une saisie vide en 0, soit « livraison toujours gratuite ».
const schema = z.object({
    name: z.string().min(1, { message: "Le nom est requis" }).trim(),
    price: z.coerce
        .number({ message: "Prix invalide" })
        .min(0, { message: "Le prix ne peut pas être négatif" }),
    freeAbove: z.string().optional(),
    estimatedDays: z.string().optional(),
    isActive: z.boolean(),
});
type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

function num(value?: string): number | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

interface ZoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zone: SerializedZone | null;
    currency: string;
    onSubmit: (values: ZoneInput) => Promise<void>;
}

export function ZoneDialog({
    open,
    onOpenChange,
    zone,
    currency,
    onSubmit,
}: ZoneDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues, unknown, ParsedValues>({
        resolver: zodResolver(schema),
    });

    const isActive = watch("isActive");

    useEffect(() => {
        reset({
            name: zone?.name ?? "",
            price: zone?.price ?? 0,
            freeAbove: zone?.freeAbove != null ? String(zone.freeAbove) : "",
            estimatedDays: zone?.estimatedDays ?? "",
            isActive: zone?.isActive ?? true,
        });
    }, [zone, open, reset]);

    const submit = async (values: ParsedValues) => {
        try {
            await onSubmit({
                name: values.name,
                price: values.price,
                freeAbove: num(values.freeAbove),
                estimatedDays: values.estimatedDays,
                isActive: values.isActive,
            });
            toast.success(zone ? "Secteur mis à jour." : "Secteur créé.");
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "L'enregistrement a échoué.",
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {zone ? "Modifier le secteur" : "Nouveau secteur"}
                    </DialogTitle>
                    <DialogDescription>
                        Un secteur correspond à une zone géographique livrée à
                        prix fixe.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="zone-name">Nom du secteur</Label>
                        <Input
                            id="zone-name"
                            placeholder="Cotonou centre"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="zone-price">
                                Prix ({currency})
                            </Label>
                            <Input
                                id="zone-price"
                                type="number"
                                min={0}
                                step="0.01"
                                {...register("price")}
                            />
                            {errors.price && (
                                <p className="text-xs text-destructive">
                                    {errors.price.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="zone-free">
                                Gratuit au-delà de
                            </Label>
                            <Input
                                id="zone-free"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="Jamais"
                                {...register("freeAbove")}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="zone-days">Délai estimé</Label>
                        <Input
                            id="zone-days"
                            placeholder="1-2 jours"
                            {...register("estimatedDays")}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="zone-active" className="font-normal">
                            Secteur actif
                        </Label>
                        <Switch
                            id="zone-active"
                            checked={isActive}
                            onCheckedChange={(v) => setValue("isActive", v)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
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
                            {zone ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
