"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";

interface QuantitySelectorProps {
    value: number;
    onChange: (value: number) => void;
    /** Borne haute, généralement le stock disponible. */
    max: number;
    disabled?: boolean;
    label?: string;
}

/** Sélecteur au format « − 1 + ». */
export function QuantitySelector({
    value,
    onChange,
    max,
    disabled = false,
    label = "Quantité",
}: QuantitySelectorProps) {
    const canDecrease = !disabled && value > 1;
    const canIncrease = !disabled && value < max;

    return (
        <div
            className="inline-flex items-center rounded-lg border border-border"
            role="group"
            aria-label={label}
        >
            <button
                type="button"
                onClick={() => onChange(value - 1)}
                disabled={!canDecrease}
                aria-label="Diminuer la quantité"
                className="flex h-9 w-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
                <IconMinus size={15} />
            </button>

            {/* aria-live : le lecteur d'écran annonce la nouvelle quantité
                sans qu'il faille déplacer le focus. */}
            <span
                className="w-10 text-center text-sm font-medium tabular-nums"
                aria-live="polite"
            >
                {value}
            </span>

            <button
                type="button"
                onClick={() => onChange(value + 1)}
                disabled={!canIncrease}
                aria-label="Augmenter la quantité"
                className="flex h-9 w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
                <IconPlus size={15} />
            </button>
        </div>
    );
}
