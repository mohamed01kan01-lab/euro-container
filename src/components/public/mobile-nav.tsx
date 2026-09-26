"use client";

import { useState } from "react";
import { IconMenu } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/public/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/public/locale-switcher";
import { ThemeToggle } from "@/components/public/theme-toggle";

interface NavLink {
    href: string;
    label: string;
}

export function MobileNav({
    links,
    menuLabel,
    themeLabels,
}: {
    links: NavLink[];
    menuLabel: string;
    themeLabels: { lightLabel: string; darkLabel: string };
}) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={menuLabel}
                    className="md:hidden"
                >
                    <IconMenu size={20} />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-3/4 sm:max-w-xs">
                <SheetHeader>
                    <SheetTitle>{menuLabel}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full px-4 py-2.5 font-display text-sm font-bold text-foreground transition-colors hover:bg-muted"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-auto flex items-center justify-center gap-3 border-t border-border p-4">
                    <LocaleSwitcher />
                    <ThemeToggle {...themeLabels} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
