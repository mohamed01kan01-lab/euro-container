"use client";

import { useRouter } from "next/navigation";
import { IconUser, IconLayoutDashboard, IconLogout } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { useSession, signOut } from "@/lib/auth-client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const iconButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

type AccountMenuProps = {
    loginAria: string;
    accountAria: string;
    dashboardLabel: string;
    logoutLabel: string;
};

/** Icône compte du header : lien /login si déconnecté, menu (tableau de bord / déconnexion) sinon. */
export function AccountMenu({ loginAria, accountAria, dashboardLabel, logoutLabel }: AccountMenuProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    if (isPending) {
        return <div className={iconButtonClass} aria-hidden />;
    }

    if (!session) {
        return (
            <Link href="/login" aria-label={loginAria} className={iconButtonClass}>
                <IconUser size={19} />
            </Link>
        );
    }

    const role = (session.user as { role?: string }).role;
    const isStaff = role === "ADMIN" || role === "EDITOR";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger aria-label={accountAria} className={iconButtonClass}>
                <IconUser size={19} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">{session.user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isStaff && (
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                            <IconLayoutDashboard size={16} />
                            {dashboardLabel}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onSelect={() => {
                        void signOut().then(() => {
                            router.push("/");
                            router.refresh();
                        });
                    }}
                >
                    <IconLogout size={16} />
                    {logoutLabel}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
