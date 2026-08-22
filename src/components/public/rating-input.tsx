"use client";

import { useState } from "react";
import { IconStar, IconStarFilled } from "@tabler/icons-react";

interface RatingInputProps {
    value: number;
    onChange: (value: number) => void;
    name?: string;
}

const LABELS = ["Très déçu", "Déçu", "Correct", "Satisfait", "Excellent"];

/**
 * Groupe de radios natifs stylés : on garde la navigation clavier (flèches),
 * l'annonce par lecteur d'écran et la sémantique de champ obligatoire, ce que
 * des boutons ou des div cliquables ne donneraient pas.
 */
export function RatingInput({
    value,
    onChange,
    name = "rating",
}: RatingInputProps) {
    const [hovered, setHovered] = useState(0);
    const shown = hovered || value;

    return (
        <fieldset>
            <legend className="sr-only">Votre note sur 5</legend>
            <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHovered(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <label
                        key={star}
                        onMouseEnter={() => setHovered(star)}
                        className="cursor-pointer p-0.5 text-primary transition-transform hover:scale-110 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-sm"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={star}
                            checked={value === star}
                            onChange={() => onChange(star)}
                            className="sr-only"
                        />
                        <span className="sr-only">
                            {star} étoile{star > 1 ? "s" : ""} — {LABELS[star - 1]}
                        </span>
                        {star <= shown ? (
                            <IconStarFilled size={26} aria-hidden />
                        ) : (
                            <IconStar
                                size={26}
                                aria-hidden
                                className="text-muted-foreground/40"
                            />
                        )}
                    </label>
                ))}

                {shown > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                        {LABELS[shown - 1]}
                    </span>
                )}
            </div>
        </fieldset>
    );
}
