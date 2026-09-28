"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import {
    IconBuildingStore,
    IconChevronUp,
    IconFolderOpen,
    IconLayoutDashboard,
    IconLogout,
    IconMessage,
    IconPackage,
    IconPhoto,
    IconFileText,
    IconSettings,
    IconShoppingCart,
    IconStar,
    IconTag,
    IconTruck,
    IconUsers,
} from "@tabler/icons-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import type { AdminBrand, AdminTodo, AdminUser } from "./admin-shell";

// ─── Nav definition ──────────────────────────────────────────────────────────

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    /** Compteur affiché à droite (éléments à traiter). */
    badge?: (todo: AdminTodo) => number;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

// Seules les sections utiles au site Euro Container figurent ici : Pages et
// Webhooks (routes inexistantes) ont été retirés du boilerplate.
const NAV_GROUPS: NavGroup[] = [
    {
        label: "Ventes",
        items: [
            {
                label: "Commandes",
                href: "/dashboard/orders",
                icon: IconShoppingCart,
                badge: (t) => t.toVerify + t.toRefund,
            },
            { label: "Produits", href: "/dashboard/products", icon: IconPackage },
            { label: "Catégories", href: "/dashboard/categories", icon: IconFolderOpen },
            { label: "Livraison", href: "/dashboard/shipping", icon: IconTruck },
            { label: "Coupons", href: "/dashboard/coupons", icon: IconTag },
        ],
    },
    {
        label: "Contenu",
        items: [
            { label: "Blog", href: "/dashboard/posts", icon: IconFileText },
            { label: "Médias", href: "/dashboard/media", icon: IconPhoto },
            { label: "Commentaires", href: "/dashboard/comments", icon: IconMessage },
            { label: "Avis clients", href: "/dashboard/reviews", icon: IconStar },
        ],
    },
    {
        label: "Configuration",
        items: [
            { label: "Réglages", href: "/dashboard/settings", icon: IconSettings },
            { label: "Utilisateurs", href: "/dashboard/users", icon: IconUsers },
        ],
    },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrateur",
    EDITOR: "Éditeur",
    CLIENT: "Client",
};

const ITEM_CLASS =
    "h-9 rounded-full px-3 text-sidebar-foreground/80 data-active:bg-orange-600 data-active:font-semibold data-active:text-white data-active:shadow-[0_8px_20px_-8px_rgba(234,88,12,.7)] data-active:hover:bg-orange-600 data-active:hover:text-white";

// ─── Component ────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
    user: AdminUser;
    brand: AdminBrand;
    todo: AdminTodo;
}

export function AdminSidebar({ user, brand, todo }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoutOpen, setLogoutOpen] = useState(false);

    const initials = user.name
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <>
            <Sidebar collapsible="icon">
                {/* Marque */}
                <SidebarHeader className="px-3 pt-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                                <Link href="/dashboard">
                                    {brand.logo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={brand.logo} alt="" className="size-8 shrink-0 rounded-lg bg-white object-contain p-0.5" />
                                    ) : (
                                        <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden className="shrink-0">
                                            <rect x="1" y="15" width="11" height="11" rx="1.5" fill="#94A3B8" />
                                            <rect x="13.5" y="15" width="11" height="11" rx="1.5" fill="#64748B" />
                                            <rect x="7" y="2" width="11" height="11" rx="1.5" fill="#EA580C" />
                                        </svg>
                                    )}
                                    <span className="flex min-w-0 flex-col gap-0.5 leading-none">
                                        <strong className="truncate font-heading text-sm font-bold text-white">
                                            {brand.siteName}
                                        </strong>
                                        <span className="text-[11px] uppercase tracking-[0.14em] text-orange-500">
                                            Administration
                                        </span>
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                {/* Navigation */}
                <SidebarContent className="px-1">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/dashboard"}
                                        tooltip="Tableau de bord"
                                        className={ITEM_CLASS}
                                    >
                                        <Link href="/dashboard">
                                            <IconLayoutDashboard size={16} />
                                            <span>Tableau de bord</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {NAV_GROUPS.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
                                {group.label}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="gap-0.5">
                                    {group.items.map((item) => {
                                        const count = item.badge?.(todo) ?? 0;
                                        const active = pathname.startsWith(item.href);
                                        return (
                                            <SidebarMenuItem key={item.href}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={active}
                                                    tooltip={item.label}
                                                    className={ITEM_CLASS}
                                                >
                                                    <Link href={item.href}>
                                                        <item.icon size={16} />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                                {count > 0 && (
                                                    <SidebarMenuBadge
                                                        className={
                                                            active
                                                                ? "top-2! right-2 rounded-full bg-white text-orange-600"
                                                                : "top-2! right-2 rounded-full bg-orange-600 text-white"
                                                        }
                                                    >
                                                        {count}
                                                    </SidebarMenuBadge>
                                                )}
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                {/* Utilisateur */}
                <SidebarFooter className="border-t border-sidebar-border p-3">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="rounded-2xl data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <Avatar className="h-8 w-8 shrink-0 rounded-full">
                                            <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                            <AvatarFallback className="rounded-full bg-orange-600 text-xs font-bold text-white">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold text-white">{user.name}</span>
                                            <span className="truncate text-xs text-sidebar-foreground/60">
                                                {ROLE_LABELS[user.role] ?? user.role}
                                            </span>
                                        </div>
                                        <IconChevronUp size={16} className="ml-auto shrink-0" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent side="top" align="end" className="w-56 rounded-2xl">
                                    <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                                        <span className="font-semibold text-foreground">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <a href="/" target="_blank" rel="noreferrer">
                                            <IconBuildingStore size={14} className="mr-2" />
                                            Voir le site
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings">
                                            <IconSettings size={14} className="mr-2" />
                                            Réglages
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={() => setLogoutOpen(true)}
                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    >
                                        <IconLogout size={14} className="mr-2" />
                                        Se déconnecter
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            {/* Confirmation de déconnexion : hors Sidebar pour ne pas être rognée */}
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous serez redirigé vers la page de connexion.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" className="rounded-full" onClick={handleSignOut}>
                            Se déconnecter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
