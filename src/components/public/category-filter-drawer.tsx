"use client";

import { useState } from "react";
import { IconFilter } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";

interface Option {
    label: string;
    href: string;
    active: boolean;
}

/** Filtre catégorie en feuille du bas, réservé au mobile (le desktop garde la barre de pilules). */
export function CategoryFilterDrawer({
    label,
    options,
}: {
    label: string;
    options: Option[];
}) {
    const [open, setOpen] = useState(false);
    const active = options.find((o) => o.active);

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-full border border-border bg-card px-4.5 py-3 text-left text-sm font-semibold md:hidden"
            >
                <IconFilter size={18} className="shrink-0 text-muted-foreground" />
                {label} : <span className="text-orange-600">{active?.label}</span>
            </button>

            <DrawerContent className="rounded-t-[26px]">
                <DrawerHeader>
                    <DrawerTitle>{label}</DrawerTitle>
                </DrawerHeader>
                <div className="grid gap-1.5 px-4 pb-8">
                    {options.map((option) => (
                        <Link
                            key={option.href}
                            href={option.href}
                            onClick={() => setOpen(false)}
                            className={
                                option.active
                                    ? "flex min-h-13 items-center justify-between rounded-2xl bg-orange-600 px-4 text-sm font-bold text-white"
                                    : "flex min-h-13 items-center justify-between rounded-2xl border border-border px-4 text-sm font-semibold"
                            }
                        >
                            {option.label}
                            {option.active && (
                                <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                        </Link>
                    ))}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
