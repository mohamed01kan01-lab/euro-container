"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import {
    IconChevronUp,
    IconFolderOpen,
    IconLayoutDashboard,
    IconLogout,
    IconMessage,
    IconPackage,
    IconPhoto,
    IconFile,
    IconFileText,
    IconSettings,
    IconShoppingCart,
    IconStar,
    IconTag,
    IconTruck,
    IconUser,
    IconUsers,
    IconWebhook,
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
import type { AdminUser } from "./admin-shell";

// ─── Nav definition ──────────────────────────────────────────────────────────

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ size?: number; className?: string }>;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        label: "Contenu",
        items: [
            { label: "Posts", href: "/dashboard/posts", icon: IconFileText },
            { label: "Médias", href: "/dashboard/media", icon: IconPhoto },
            { label: "Pages", href: "/dashboard/pages", icon: IconFile },
        ],
    },
    {
        label: "Commerce",
        items: [
            {
                label: "Produits",
                href: "/dashboard/products",
                icon: IconPackage,
            },
            {
                label: "Commandes",
                href: "/dashboard/orders",
                icon: IconShoppingCart,
            },
            { label: "Coupons", href: "/dashboard/coupons", icon: IconTag },
            {
                label: "Livraison",
                href: "/dashboard/shipping",
                icon: IconTruck,
            },
            {
                label: "Catégories",
                href: "/dashboard/categories",
                icon: IconFolderOpen,
            },
        ],
    },
    {
        label: "Modération",
        items: [
            {
                label: "Commentaires",
                href: "/dashboard/comments",
                icon: IconMessage,
            },
            { label: "Avis", href: "/dashboard/reviews", icon: IconStar },
        ],
    },
    {
        label: "Configuration",
        items: [
            {
                label: "Réglages",
                href: "/dashboard/settings",
                icon: IconSettings,
            },
            {
                label: "Utilisateurs",
                href: "/dashboard/users",
                icon: IconUsers,
            },
            {
                label: "Webhooks",
                href: "/dashboard/webhooks",
                icon: IconWebhook,
            },
        ],
    },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrateur",
    EDITOR: "Éditeur",
    CLIENT: "Client",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
    user: AdminUser;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
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
                {/* Brand */}
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href="/dashboard">
                                    <figure className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                                        <span className="text-xs font-bold">
                                            NP
                                        </span>
                                    </figure>
                                    <div className="flex flex-col gap-0.5 leading-none">
                                        <strong className="font-semibold text-sidebar-foreground">
                                            NextPress
                                        </strong>
                                        <span className="text-xs text-sidebar-foreground/60">
                                            Admin
                                        </span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                {/* Navigation */}
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/dashboard"}
                                        tooltip="Dashboard"
                                    >
                                        <Link href="/dashboard">
                                            <IconLayoutDashboard size={16} />
                                            <span>Dashboard</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {NAV_GROUPS.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname.startsWith(
                                                    item.href,
                                                )}
                                                tooltip={item.label}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon size={16} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                {/* User footer */}
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                            <AvatarImage
                                                src={user.image ?? undefined}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="rounded-lg text-xs">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {user.name}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </span>
                                        </div>
                                        <IconChevronUp
                                            size={16}
                                            className="ml-auto shrink-0"
                                        />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    side="top"
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                                        <span className="font-semibold text-foreground">
                                            {user.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {ROLE_LABELS[user.role] ??
                                                user.role}
                                        </span>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/profile">
                                            <IconUser
                                                size={14}
                                                className="mr-2"
                                            />
                                            Mon profil
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings">
                                            <IconSettings
                                                size={14}
                                                className="mr-2"
                                            />
                                            Réglages
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={() => setLogoutOpen(true)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        <IconLogout
                                            size={14}
                                            className="mr-2"
                                        />
                                        Se déconnecter
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            {/* Logout confirmation — outside Sidebar so it's not clipped */}
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous serez redirigé vers la page de connexion.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleSignOut}
                        >
                            Se déconnecter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
