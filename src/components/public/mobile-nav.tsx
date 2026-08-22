"use client";

import { useState } from "react";
import { IconMenu } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/public/locale-switcher";

interface NavLink {
    href: string;
    label: string;
}

export function MobileNav({
    links,
    menuLabel,
}: {
    links: NavLink[];
    menuLabel: string;
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
                            className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-auto flex justify-center border-t border-border p-4">
                    <LocaleSwitcher />
                </div>
            </SheetContent>
        </Sheet>
    );
}
