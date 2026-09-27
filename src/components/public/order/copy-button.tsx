"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function copyText(value: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}

export function useCopy() {
    const [copied, setCopied] = useState<string | null>(null);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(null), 1800);
        return () => clearTimeout(t);
    }, [copied]);

    async function copy(id: string, value: string, label?: string) {
        if (await copyText(value)) {
            setCopied(id);
            if (label) toast.success(`${label} copié`);
        } else {
            toast.error("Copie impossible : sélectionnez le texte manuellement.");
        }
    }
    return { copied, copy };
}

/** Ligne « libellé / valeur » copiable d'un clic, pensée pour le mobile. */
export function CopyRow({
    label,
    value,
    display,
    mono,
    highlight,
}: {
    label: string;
    value: string;
    display?: string;
    mono?: boolean;
    highlight?: boolean;
}) {
    const { copied, copy } = useCopy();
    const done = copied === label;
    return (
        <button
            type="button"
            onClick={() => copy(label, value)}
            className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
        >
            <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span
                    className={cn(
                        "block break-words text-sm font-semibold",
                        mono && "font-mono tracking-wide",
                        highlight && "text-base text-orange-600",
                    )}
                >
                    {display ?? value}
                </span>
            </span>
            <span
                className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    done
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-border text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground",
                )}
                aria-live="polite"
            >
                {done ? <IconCheck size={13} /> : <IconCopy size={13} />}
                {done ? "Copié" : "Copier"}
            </span>
        </button>
    );
}
