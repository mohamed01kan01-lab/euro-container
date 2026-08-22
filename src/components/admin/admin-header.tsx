"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { IconBell, IconMoon, IconSun } from "@tabler/icons-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/posts": "Posts",
    "/dashboard/media": "Médiathèque",
    "/dashboard/pages": "Pages",
    "/dashboard/products": "Produits",
    "/dashboard/orders": "Commandes",
    "/dashboard/coupons": "Coupons",
    "/dashboard/shipping": "Livraison",
    "/dashboard/categories": "Catégories",
    "/dashboard/comments": "Commentaires",
    "/dashboard/reviews": "Avis",
    "/dashboard/settings": "Réglages",
    "/dashboard/users": "Utilisateurs",
    "/dashboard/webhooks": "Webhooks",
    "/dashboard/profile": "Mon profil",
};

function resolveTitle(pathname: string): string {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const match = Object.entries(PAGE_TITLES)
        .filter(([key]) => key !== "/dashboard" && pathname.startsWith(key))
        .sort((a, b) => b[0].length - a[0].length)[0];
    return match?.[1] ?? "Dashboard";
}

export function AdminHeader() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const title = resolveTitle(pathname);
    const isHome = pathname === "/dashboard";

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />

            <Breadcrumb>
                <BreadcrumbList>
                    {isHome ? (
                        <BreadcrumbItem>
                            <BreadcrumbPage>Dashboard</BreadcrumbPage>
                        </BreadcrumbItem>
                    ) : (
                        <>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard">
                                    Dashboard
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{title}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </>
                    )}
                </BreadcrumbList>
            </Breadcrumb>

            <nav
                className="ml-auto flex items-center gap-2"
                aria-label="Actions rapides"
            >
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Notifications"
                >
                    <IconBell size={18} />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label={
                        theme === "dark"
                            ? "Passer en mode clair"
                            : "Passer en mode sombre"
                    }
                    onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                    }
                    suppressHydrationWarning
                >
                    {theme === "dark" ? (
                        <IconSun size={18} />
                    ) : (
                        <IconMoon size={18} />
                    )}
                </Button>
            </nav>
        </header>
    );
}
