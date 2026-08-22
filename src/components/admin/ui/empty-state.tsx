import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: ComponentType<{ size?: number; className?: string }>;
    title: string;
    description?: string;
    /** Issue proposée : créer l'élément, réinitialiser les filtres… */
    action?: ReactNode;
    className?: string;
}

/**
 * État vide du dashboard, aligné sur celui des pages publiques.
 * Un état vide doit toujours proposer une issue, sinon l'utilisateur reste
 * devant une page morte sans savoir quoi faire.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center gap-4 px-6 py-16 text-center",
                className,
            )}
        >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Icon size={24} className="text-muted-foreground" />
            </span>

            <div className="space-y-1">
                <p className="font-medium">{title}</p>
                {description && (
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>

            {action}
        </div>
    );
}
