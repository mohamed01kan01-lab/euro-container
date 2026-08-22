"use client";

import { useState } from "react";
import {
    IconPhotoPlus,
    IconX,
    IconArrowLeft,
    IconArrowRight,
    IconStar,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";

interface MediaGalleryInputProps {
    value: string[];
    onChange: (urls: string[]) => void;
}

/**
 * Galerie multi-images. MediaPickerDialog ne renvoie qu'un média à la fois,
 * l'ajout est donc unitaire ; le réordonnancement sert à désigner l'image
 * principale, qui est la première du tableau.
 */
export function MediaGalleryInput({ value, onChange }: MediaGalleryInputProps) {
    const [pickerOpen, setPickerOpen] = useState(false);

    function add(url: string) {
        if (value.includes(url)) return;
        onChange([...value, url]);
    }

    function remove(index: number) {
        onChange(value.filter((_, i) => i !== index));
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= value.length) return;
        const next = [...value];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    return (
        <div className="space-y-3">
            {value.length > 0 && (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {value.map((url, index) => (
                        <li
                            key={`${url}-${index}`}
                            className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted"
                        >
                            {/* <img> comme le reste des composants médias :
                                les URLs Cloudinary sont arbitraires et aucun
                                remotePatterns n'est configuré. */}
                            <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                            />

                            {index === 0 && (
                                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                                    <IconStar size={10} />
                                    Principale
                                </span>
                            )}

                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <div className="flex gap-0.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={index === 0}
                                        onClick={() => move(index, -1)}
                                        aria-label="Déplacer vers la gauche"
                                    >
                                        <IconArrowLeft size={13} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={index === value.length - 1}
                                        onClick={() => move(index, 1)}
                                        aria-label="Déplacer vers la droite"
                                    >
                                        <IconArrowRight size={13} />
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => remove(index)}
                                    aria-label="Retirer cette image"
                                >
                                    <IconX size={13} />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="w-full"
            >
                <IconPhotoPlus size={16} className="mr-2" />
                Ajouter une image
            </Button>

            {value.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    La première image ajoutée sert de visuel principal dans les
                    listes et le flux Merchant Center.
                </p>
            )}

            <MediaPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={(url) => add(url)}
                accept="image"
                title="Ajouter à la galerie"
            />
        </div>
    );
}
