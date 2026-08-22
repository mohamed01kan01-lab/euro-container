import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableCardProps {
    children: ReactNode;
    className?: string;
}

/**
 * Coque des tables du dashboard.
 *
 * `overflow-x-auto` est ici le point important : sans lui, une table large
 * élargit toute la page sur mobile au lieu de défiler dans sa carte.
 */
export function TableCard({ children, className }: TableCardProps) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-xl border border-border bg-card",
                className,
            )}
        >
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}
