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

interface AdminShellProps {
    user: AdminUser;
    children: ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AdminSidebar user={user} />
                <SidebarInset>
                    <AdminHeader />
                    <div className="flex flex-col flex-1 gap-4 p-6">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}
