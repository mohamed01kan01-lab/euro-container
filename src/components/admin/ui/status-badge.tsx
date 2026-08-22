import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "accent";

/**
 * Un seul endroit décide des couleurs de statut, en clair comme en sombre.
 * Ces chaînes étaient auparavant recopiées à l'identique dans les badges de
 * stock, de rôle et de modération, avec le risque qu'une variante sombre soit
 * oubliée dans l'une des copies.
 */
const TONES: Record<StatusTone, string> = {
    success:
        "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    warning:
        "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    accent: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
    neutral: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
    tone: StatusTone;
    children: ReactNode;
    icon?: ReactNode;
    className?: string;
    title?: string;
}

export function StatusBadge({
    tone,
    children,
    icon,
    className,
    title,
}: StatusBadgeProps) {
    return (
        <Badge
            variant="outline"
            title={title}
            className={cn(
                "gap-1 whitespace-nowrap font-medium",
                TONES[tone],
                className,
            )}
        >
            {icon}
            {children}
        </Badge>
    );
}
