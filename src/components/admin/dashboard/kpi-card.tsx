import type { ComponentType, ReactNode } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
    label: string;
    value: string;
    delta: number | null;
    icon: ComponentType<{ size?: number; className?: string }>;
    /** Carte mise en avant (accent orange), ex. éléments à traiter. */
    highlight?: boolean;
    footer?: ReactNode;
}

export function KpiCard({ label, value, delta, icon: Icon, highlight, footer }: KpiCardProps) {
    const isUp = delta !== null && delta > 0;
    const isDown = delta !== null && delta < 0;

    return (
        <article
            className={cn(
                "flex flex-col gap-3 rounded-3xl border p-5",
                highlight ? "border-orange-600/40 bg-orange-600/5" : "border-border bg-card",
            )}
        >
            <header className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <figure
                    className={cn(
                        "flex size-10 items-center justify-center rounded-full",
                        highlight ? "bg-orange-600 text-white" : "bg-primary/10 text-primary",
                    )}
                >
                    <Icon size={18} />
                </figure>
            </header>

            <p className="font-heading text-3xl font-semibold tracking-tight">{value}</p>
            {footer}

            {delta !== null && (
                <footer className="flex items-center gap-1 text-xs font-medium">
                    {isUp && (
                        <>
                            <IconTrendingUp size={14} className="text-emerald-500" />
                            <span className="text-emerald-500">+{delta.toFixed(1)}% vs hier</span>
                        </>
                    )}
                    {isDown && (
                        <>
                            <IconTrendingDown size={14} className="text-destructive" />
                            <span className="text-destructive">{delta.toFixed(1)}% vs hier</span>
                        </>
                    )}
                    {!isUp && !isDown && (
                        <span className="text-muted-foreground">= vs hier</span>
                    )}
                </footer>
            )}
        </article>
    );
}
