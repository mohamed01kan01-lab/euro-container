"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
    IconChecklist,
    IconExternalLink,
    IconMoon,
    IconSun,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AdminTodo } from "./admin-shell";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Tableau de bord",
    "/dashboard/orders": "Commandes",
    "/dashboard/products": "Produits",
    "/dashboard/categories": "Catégories",
    "/dashboard/shipping": "Livraison",
    "/dashboard/coupons": "Coupons",
    "/dashboard/posts": "Blog",
    "/dashboard/media": "Médiathèque",
    "/dashboard/comments": "Commentaires",
    "/dashboard/reviews": "Avis clients",
    "/dashboard/settings": "Réglages",
    "/dashboard/users": "Utilisateurs",
};

function resolveTitle(pathname: string): string {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const match = Object.entries(PAGE_TITLES)
        .filter(([key]) => key !== "/dashboard" && pathname.startsWith(key))
        .sort((a, b) => b[0].length - a[0].length)[0];
    return match?.[1] ?? "Tableau de bord";
}

export function AdminHeader({ todo }: { todo: AdminTodo }) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const pending = todo.toVerify + todo.toRefund;

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger className="-ml-1 rounded-full" />
            <Separator orientation="vertical" className="h-5" />
            <p className="truncate font-heading text-base font-semibold">
                {resolveTitle(pathname)}
            </p>

            <nav className="ml-auto flex items-center gap-2" aria-label="Actions rapides">
                {pending > 0 && (
                    <Link
                        href={todo.toVerify > 0 ? "/dashboard/orders?payment=VERIFYING" : "/dashboard/orders?payment=REFUND_REQUESTED"}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-600 px-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,.7)] transition-colors hover:bg-orange-700"
                    >
                        <IconChecklist size={16} />
                        <span className="hidden sm:inline">À traiter</span>
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs text-orange-600">
                            {pending}
                        </span>
                    </Link>
                )}
                <Button variant="outline" size="sm" className="hidden rounded-full sm:inline-flex" asChild>
                    <a href="/" target="_blank" rel="noreferrer">
                        <IconExternalLink size={15} />
                        Voir le site
                    </a>
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    suppressHydrationWarning
                >
                    {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
                </Button>
            </nav>
        </header>
    );
}
