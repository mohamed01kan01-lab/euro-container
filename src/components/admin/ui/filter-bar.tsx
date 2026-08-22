"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBarProps {
    children: ReactNode;
    /** Paramètres pris en compte pour décider d'afficher « Réinitialiser ». */
    watch?: string[];
    className?: string;
}

/**
 * Barre de filtres commune. Le bouton de réinitialisation apparaît dès qu'un
 * paramètre surveillé est présent dans l'URL — la condition était jusqu'ici
 * recopiée différemment dans chaque page.
 */
export function FilterBar({ children, watch, className }: FilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const hasFilters = watch
        ? watch.some((key) => !!searchParams.get(key))
        : searchParams.size > 0;

    return (
        <nav
            className={cn("flex flex-wrap items-center gap-2", className)}
            aria-label="Filtres"
        >
            {children}

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(pathname)}
                    className="gap-1.5"
                >
                    <IconX size={14} />
                    Réinitialiser
                </Button>
            )}
        </nav>
    );
}
