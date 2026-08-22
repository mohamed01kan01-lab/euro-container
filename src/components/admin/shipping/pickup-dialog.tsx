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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { mapEmbedUrl } from "@/lib/maps";
import type {
    SerializedPickupPoint,
    PickupPointInput,
} from "@/app/(admin)/dashboard/shipping/actions";

const schema = z.object({
    name: z.string().min(1, { message: "Le nom est requis" }).trim(),
    address: z.string().min(4, { message: "L'adresse est requise" }).trim(),
    details: z.string().optional(),
    hours: z.string().optional(),
    isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface PickupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    point: SerializedPickupPoint | null;
    onSubmit: (values: PickupPointInput) => Promise<void>;
}

export function PickupDialog({
    open,
    onOpenChange,
    point,
    onSubmit,
}: PickupDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const isActive = watch("isActive");
    const address = watch("address");

    useEffect(() => {
        reset({
            name: point?.name ?? "",
            address: point?.address ?? "",
            details: point?.details ?? "",
            hours: point?.hours ?? "",
            isActive: point?.isActive ?? true,
        });
    }, [point, open, reset]);

    const submit = async (values: FormValues) => {
        try {
            await onSubmit(values);
            toast.success(
                point ? "Point de retrait mis à jour." : "Point de retrait créé.",
            );
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "L'enregistrement a échoué.",
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {point
                            ? "Modifier le point de retrait"
                            : "Nouveau point de retrait"}
                    </DialogTitle>
                    <DialogDescription>
                        La carte est déduite de l&apos;adresse — aucun lien à
                        fournir.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="pickup-name">Nom</Label>
                        <Input
                            id="pickup-name"
                            placeholder="Boutique Cotonou"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pickup-address">Adresse</Label>
                        <Input
                            id="pickup-address"
                            placeholder="Rue 12, Akpakpa, Cotonou"
                            {...register("address")}
                        />
                        {errors.address && (
                            <p className="text-xs text-destructive">
                                {errors.address.message}
                            </p>
                        )}
                    </div>

                    {/* Aperçu immédiat : on voit tout de suite si l'adresse
                        est assez précise pour être localisée. */}
                    {address && address.trim().length > 3 && (
                        <div className="space-y-1.5">
                            <Label>Aperçu de la carte</Label>
                            <div className="overflow-hidden rounded-xl border border-border">
                                <iframe
                                    key={address}
                                    src={mapEmbedUrl(address)}
                                    title="Aperçu de l'emplacement"
                                    loading="lazy"
                                    className="h-48 w-full"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="pickup-details">
                            Détails d&apos;accès
                        </Label>
                        <Textarea
                            id="pickup-details"
                            rows={2}
                            placeholder="1er étage, en face de la pharmacie…"
                            className="resize-none"
                            {...register("details")}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pickup-hours">Horaires</Label>
                        <Input
                            id="pickup-hours"
                            placeholder="Lun-Sam 9h-18h"
                            {...register("hours")}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="pickup-active" className="font-normal">
                            Point actif
                        </Label>
                        <Switch
                            id="pickup-active"
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
                            {point ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
