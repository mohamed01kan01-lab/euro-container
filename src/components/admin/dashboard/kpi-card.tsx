import type { ComponentType } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

interface KpiCardProps {
    label: string;
    value: string;
    delta: number | null;
    icon: ComponentType<{ size?: number; className?: string }>;
}

export function KpiCard({ label, value, delta, icon: Icon }: KpiCardProps) {
    const isUp = delta !== null && delta > 0;
    const isDown = delta !== null && delta < 0;

    return (
        <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <header className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <figure className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon size={18} className="text-primary" />
                </figure>
            </header>

            <p className="text-2xl font-bold tracking-tight">{value}</p>

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
