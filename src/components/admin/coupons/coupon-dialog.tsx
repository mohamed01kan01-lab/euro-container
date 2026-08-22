"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconChevronDown, IconCheck, IconX } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type {
    CouponInput,
    SerializedCoupon,
} from "@/app/(admin)/dashboard/coupons/actions";

// ─── Schéma ───────────────────────────────────────────────────────────────────

const schema = z
    .object({
        code: z.string().min(3, { message: "3 caractères minimum" }).trim(),
        type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
        value: z.string().optional(),
        minAmount: z.string().optional(),
        maxUses: z.string().optional(),
        startsAt: z.string().optional(),
        expiresAt: z.string().optional(),
        isActive: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.type !== "FREE_SHIPPING") {
            const value = num(data.value);
            if (value === null || value <= 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["value"],
                    message: "Renseignez une valeur supérieure à 0",
                });
            } else if (data.type === "PERCENTAGE" && value > 100) {
                ctx.addIssue({
                    code: "custom",
                    path: ["value"],
                    message: "Un pourcentage ne peut pas dépasser 100",
                });
            }
        }

        if (data.startsAt && data.expiresAt && data.expiresAt < data.startsAt) {
            ctx.addIssue({
                code: "custom",
                path: ["expiresAt"],
                message: "La date de fin doit suivre la date de début",
            });
        }
    });

type FormValues = z.infer<typeof schema>;

function num(value?: string): number | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

// ─── Multi-sélection ──────────────────────────────────────────────────────────

interface PickerProps {
    label: string;
    options: { id: string; name: string }[];
    selected: string[];
    onChange: (ids: string[]) => void;
}

function MultiPicker({ label, options, selected, onChange }: PickerProps) {
    const [open, setOpen] = useState(false);
    const chosen = options.filter((o) => selected.includes(o.id));

    function toggle(id: string) {
        onChange(
            selected.includes(id)
                ? selected.filter((s) => s !== id)
                : [...selected, id],
        );
    }

    if (options.length === 0) return null;

    return (
        <div className="space-y-2">
            <Label className="text-sm font-normal">{label}</Label>
            {chosen.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {chosen.map((o) => (
                        <Badge
                            key={o.id}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {o.name}
                            <button
                                type="button"
                                onClick={() => toggle(o.id)}
                                className="hover:text-destructive transition-colors"
                                aria-label={`Retirer ${o.name}`}
                            >
                                <IconX size={10} />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-muted-foreground font-normal"
                    >
                        {chosen.length > 0
                            ? `${chosen.length} sélectionné${chosen.length > 1 ? "s" : ""}`
                            : "Tout (aucune restriction)"}
                        <IconChevronDown size={14} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Rechercher…" />
                        <CommandList>
                            <CommandEmpty>Aucun résultat.</CommandEmpty>
                            <CommandGroup>
                                {options.map((o) => (
                                    <CommandItem
                                        key={o.id}
                                        value={o.name}
                                        onSelect={() => toggle(o.id)}
                                    >
                                        <IconCheck
                                            size={14}
                                            className={
                                                selected.includes(o.id)
                                                    ? "mr-2 opacity-100"
                                                    : "mr-2 opacity-0"
                                            }
                                        />
                                        {o.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface CouponDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupon: SerializedCoupon | null;
    products: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    currency: string;
    onSubmit: (values: CouponInput) => Promise<void>;
}

export function CouponDialog({
    open,
    onOpenChange,
    coupon,
    products,
    categories,
    currency,
    onSubmit,
}: CouponDialogProps) {
    const [productIds, setProductIds] = useState<string[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const type = watch("type");
    const isActive = watch("isActive");

    useEffect(() => {
        reset({
            code: coupon?.code ?? "",
            type: coupon?.type ?? "PERCENTAGE",
            value: coupon ? String(coupon.value) : "",
            minAmount: coupon?.minAmount != null ? String(coupon.minAmount) : "",
            maxUses: coupon?.maxUses != null ? String(coupon.maxUses) : "",
            // <input type="date"> attend YYYY-MM-DD.
            startsAt: coupon?.startsAt?.slice(0, 10) ?? "",
            expiresAt: coupon?.expiresAt?.slice(0, 10) ?? "",
            isActive: coupon?.isActive ?? true,
        });
        setProductIds(coupon?.productIds ?? []);
        setCategoryIds(coupon?.categoryIds ?? []);
    }, [coupon, open, reset]);

    const submit = async (values: FormValues) => {
        try {
            await onSubmit({
                code: values.code,
                type: values.type,
                value: num(values.value) ?? 0,
                minAmount: num(values.minAmount),
                maxUses: num(values.maxUses),
                startsAt: values.startsAt || null,
                expiresAt: values.expiresAt || null,
                isActive: values.isActive,
                productIds,
                categoryIds,
            });
            toast.success(coupon ? "Coupon mis à jour." : "Coupon créé.");
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "L'enregistrement a échoué.",
            );
        }
    };

    const valueSuffix = type === "PERCENTAGE" ? "%" : currency;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {coupon ? "Modifier le coupon" : "Nouveau coupon"}
                    </DialogTitle>
                    <DialogDescription>
                        Le code est normalisé en majuscules et doit être unique.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="coupon-code">Code</Label>
                        <Input
                            id="coupon-code"
                            placeholder="BIENVENUE10"
                            className="font-mono uppercase"
                            {...register("code")}
                        />
                        {errors.code && (
                            <p className="text-xs text-destructive">
                                {errors.code.message}
                            </p>
                        )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="coupon-type">Type</Label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setValue("type", v as FormValues["type"])
                                }
                            >
                                <SelectTrigger
                                    id="coupon-type"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENTAGE">
                                        Pourcentage
                                    </SelectItem>
                                    <SelectItem value="FIXED">
                                        Montant fixe
                                    </SelectItem>
                                    <SelectItem value="FREE_SHIPPING">
                                        Livraison gratuite
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Une livraison offerte n'a pas de montant à saisir. */}
                        {type !== "FREE_SHIPPING" && (
                            <div className="space-y-1.5">
                                <Label htmlFor="coupon-value">
                                    Valeur ({valueSuffix})
                                </Label>
                                <Input
                                    id="coupon-value"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    {...register("value")}
                                />
                                {errors.value && (
                                    <p className="text-xs text-destructive">
                                        {errors.value.message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="coupon-min">
                                Montant minimum ({currency})
                            </Label>
                            <Input
                                id="coupon-min"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="—"
                                {...register("minAmount")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="coupon-max-uses">
                                Limite d&apos;utilisation
                            </Label>
                            <Input
                                id="coupon-max-uses"
                                type="number"
                                min={1}
                                placeholder="Illimitée"
                                {...register("maxUses")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="coupon-starts">Début</Label>
                            <Input
                                id="coupon-starts"
                                type="date"
                                {...register("startsAt")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="coupon-expires">Fin</Label>
                            <Input
                                id="coupon-expires"
                                type="date"
                                {...register("expiresAt")}
                            />
                            {errors.expiresAt && (
                                <p className="text-xs text-destructive">
                                    {errors.expiresAt.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <MultiPicker
                        label="Limiter à des produits"
                        options={products}
                        selected={productIds}
                        onChange={setProductIds}
                    />

                    <MultiPicker
                        label="Limiter à des catégories"
                        options={categories}
                        selected={categoryIds}
                        onChange={setCategoryIds}
                    />

                    <Separator />

                    <div className="flex items-center justify-between">
                        <Label htmlFor="coupon-active" className="font-normal">
                            Coupon actif
                        </Label>
                        <Switch
                            id="coupon-active"
                            checked={isActive}
                            onCheckedChange={(v) => setValue("isActive", v)}
                        />
                    </div>

                    {coupon && (
                        <p className="text-xs text-muted-foreground">
                            Utilisé {coupon.usedCount} fois
                            {coupon.maxUses != null
                                ? ` sur ${coupon.maxUses}`
                                : ""}
                            .
                        </p>
                    )}

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
                            {coupon ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
