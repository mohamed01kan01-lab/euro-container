"use client";

import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "./sidebar";
import { AdminHeader } from "./admin-header";

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
}

export interface AdminBrand {
    siteName: string;
    logo: string | null;
}

export interface AdminTodo {
    toVerify: number;
    toRefund: number;
}

interface AdminShellProps {
    user: AdminUser;
    brand: AdminBrand;
    todo: AdminTodo;
    children: ReactNode;
}

/**
 * Les composants shadcn sont partagés avec le site public : plutôt que de les
 * modifier, le langage visuel du site (boutons pilule, champs arrondis) est
 * appliqué ici, par variantes Tailwind limitées au contenu du dashboard.
 */
const PUBLIC_SHAPES = [
    "[&_[data-slot=button]]:rounded-full",
    "[&_[data-slot=input]]:rounded-xl",
    "[&_[data-slot=textarea]]:rounded-xl",
    "[&_[data-slot=select-trigger]]:rounded-xl",
    "[&_[data-slot=badge]]:rounded-full",
    "[&_[data-slot=tabs-list]]:rounded-full",
    "[&_[data-slot=tabs-trigger]]:rounded-full",
].join(" ");

export function AdminShell({ user, brand, todo, children }: AdminShellProps) {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AdminSidebar user={user} brand={brand} todo={todo} />
                <SidebarInset className="bg-muted/40">
                    <AdminHeader todo={todo} />
                    <div className={`flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8 ${PUBLIC_SHAPES}`}>
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
