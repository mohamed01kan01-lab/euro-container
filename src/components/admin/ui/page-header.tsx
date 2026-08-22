import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    /** Compteur ou phrase courte sous le titre. */
    description?: ReactNode;
    /** Bouton principal, ou tout bloc aligné à droite. */
    actions?: ReactNode;
    className?: string;
}

/**
 * En-tête unique des pages du dashboard : absorbe les trois variantes qui
 * coexistaient (avec compteur, sans compteur, avec carte de statistique).
 */
export function PageHeader({
    title,
    description,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <header
            className={cn(
                "flex flex-wrap items-start justify-between gap-4",
                className,
            )}
        >
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
        </header>
    );
}
