"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductFormValues } from "./product-editor";

/**
 * Variantes du produit (taille, couleur…). À l'enregistrement, l'ensemble est
 * remplacé côté serveur : il n'y a donc pas d'identifiant à conserver ici.
 */
export function VariantsField() {
    const { control, register } = useFormContext<ProductFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "variants",
    });

    return (
        <div className="space-y-3">
            {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Aucune variante. Ajoutez-en pour décliner ce produit par
                    taille, couleur ou toute autre caractéristique.
                </p>
            )}

            {fields.map((field, index) => (
                <div
                    key={field.id}
                    className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_100px_120px_auto] gap-2 items-end rounded-lg border border-border p-3"
                >
                    <div className="space-y-1">
                        <Label
                            htmlFor={`variant-name-${index}`}
                            className="text-xs text-muted-foreground"
                        >
                            Type
                        </Label>
                        <Input
                            id={`variant-name-${index}`}
                            placeholder="Taille"
                            className="h-8 text-sm"
                            {...register(`variants.${index}.name`)}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label
                            htmlFor={`variant-value-${index}`}
                            className="text-xs text-muted-foreground"
                        >
                            Valeur
                        </Label>
                        <Input
                            id={`variant-value-${index}`}
                            placeholder="XL"
                            className="h-8 text-sm"
                            {...register(`variants.${index}.value`)}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label
                            htmlFor={`variant-stock-${index}`}
                            className="text-xs text-muted-foreground"
                        >
                            Stock
                        </Label>
                        <Input
                            id={`variant-stock-${index}`}
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            {...register(`variants.${index}.stock`, {
                                valueAsNumber: true,
                            })}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label
                            htmlFor={`variant-price-${index}`}
                            className="text-xs text-muted-foreground"
                        >
                            Prix (option.)
                        </Label>
                        <Input
                            id={`variant-price-${index}`}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="—"
                            className="h-8 text-sm"
                            {...register(`variants.${index}.price`)}
                        />
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                        aria-label={`Supprimer la variante ${index + 1}`}
                    >
                        <IconTrash size={15} />
                    </Button>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                    append({ name: "", value: "", stock: 0, price: "" })
                }
            >
                <IconPlus size={16} className="mr-2" />
                Ajouter une variante
            </Button>
        </div>
    );
}
