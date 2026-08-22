"use client";

import { useState } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/public/button";

/** Icône de recherche mobile : révèle une barre de recherche pleine largeur sous le header. */
export function HeaderSearch({
    action,
    placeholder,
    menuLabel,
}: {
    action: string;
    placeholder: string;
    menuLabel: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="md:hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={menuLabel}
                aria-expanded={open}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
                {open ? <IconX size={19} /> : <IconSearch size={19} />}
            </button>

            {open && (
                <div className="fixed inset-x-0 top-16 z-40 border-b border-border bg-background/95 p-3 backdrop-blur">
                    <form
                        action={action}
                        method="GET"
                        className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-sm"
                    >
                        <IconSearch
                            size={18}
                            className="shrink-0 text-muted-foreground"
                            aria-hidden
                        />
                        <Input
                            type="search"
                            name="q"
                            placeholder={placeholder}
                            autoFocus
                            className="h-9 rounded-full border-0 shadow-none focus-visible:ring-0"
                        />
                        <Button type="submit" size="sm" variant="accent">
                            <IconSearch size={16} />
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
