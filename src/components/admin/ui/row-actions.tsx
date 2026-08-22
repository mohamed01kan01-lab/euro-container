"use client";

import type { ReactNode } from "react";
import { IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowActionsProps {
    /** Nom de l'élément concerné : rend l'intitulé du menu explicite. */
    label: string;
    children: ReactNode;
    disabled?: boolean;
}

/**
 * Déclencheur d'actions de ligne, unique dans tout le dashboard.
 *
 * L'`aria-label` est construit ici et non laissé à l'appelant : un bouton
 * d'icône sans intitulé est annoncé « bouton » par un lecteur d'écran, sur
 * chaque ligne du tableau.
 */
export function RowActions({ label, children, disabled }: RowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={disabled}
                    aria-label={`Actions pour ${label}`}
                >
                    <IconDotsVertical size={15} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
