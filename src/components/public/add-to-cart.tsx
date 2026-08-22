"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconShoppingCartPlus, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/public/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addToCart } from "@/app/[locale]/(public)/cart/actions";
import { QuantitySelector } from "./quantity-selector";

export interface CartVariant {
    id: string;
    name: string;
    value: string;
    stock: number;
}

interface AddToCartProps {
    productId: string;
    productStock: number;
    variants: CartVariant[];
}

export function AddToCart({
    productId,
    productStock,
    variants,
}: AddToCartProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [quantity, setQuantity] = useState(1);
    const [variantId, setVariantId] = useState<string | null>(null);

    const hasVariants = variants.length > 0;
    const selected = variants.find((v) => v.id === variantId) ?? null;

    // Avec variantes, le stock pertinent est celui de la variante choisie.
    const stock = hasVariants ? (selected?.stock ?? 0) : productStock;
    const outOfStock = hasVariants
        ? variants.every((v) => v.stock <= 0)
        : productStock <= 0;

    /* ProductVariant est une liste plate, pas une matrice : une ligne de panier
       ne peut porter qu'une seule variante. On regroupe par type uniquement pour
       l'affichage, la sélection reste unique. */
    const groups = variants.reduce<Record<string, CartVariant[]>>(
        (acc, variant) => {
            (acc[variant.name] ??= []).push(variant);
            return acc;
        },
        {},
    );

    function submit() {
        if (hasVariants && !variantId) {
            toast.error("Choisissez une option avant d'ajouter au panier.");
            return;
        }
        startTransition(async () => {
            try {
                await addToCart({ productId, variantId, quantity });
                toast.success("Ajouté au panier.", {
                    action: {
                        label: "Voir le panier",
                        onClick: () => router.push("/cart"),
                    },
                });
                setQuantity(1);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "L'ajout a échoué.",
                );
            }
        });
    }

    if (outOfStock) {
        return (
            <Button size="lg" className="w-full" disabled>
                Rupture de stock
            </Button>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(groups).map(([name, options]) => (
                <div key={name} className="space-y-2">
                    <Label className="text-sm font-medium">{name}</Label>
                    <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                            const disabled = option.stock <= 0;
                            const active = variantId === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={active}
                                    onClick={() => {
                                        setVariantId(option.id);
                                        setQuantity(1);
                                    }}
                                    className={
                                        disabled
                                            ? "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground line-through opacity-50"
                                            : active
                                              ? "rounded-full border-2 border-primary px-3.5 py-1.5 text-sm font-medium"
                                              : "rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:border-primary/40"
                                    }
                                >
                                    {option.value}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
                <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    max={Math.max(1, stock)}
                    disabled={pending || (hasVariants && !variantId)}
                />

                <Button
                    size="lg"
                    variant="accent"
                    className="flex-1"
                    onClick={submit}
                    disabled={pending}
                >
                    {pending ? (
                        <IconLoader2 size={18} className="mr-2 animate-spin" />
                    ) : (
                        <IconShoppingCartPlus size={18} className="mr-2" />
                    )}
                    Ajouter au panier
                </Button>
            </div>

            {hasVariants && !variantId && (
                <p className="text-xs text-muted-foreground">
                    Sélectionnez une option pour continuer.
                </p>
            )}
        </div>
    );
}
