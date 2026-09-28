"use client";

import { useRouter } from "next/navigation";
import { IconUser, IconLayoutDashboard, IconLogout, IconPackage, IconUserCircle } from "@tabler/icons-react";
import NextLink from "next/link";
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
    "relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

type AccountMenuProps = {
    loginAria: string;
    accountAria: string;
    dashboardLabel: string;
    ordersLabel: string;
    accountLabel: string;
    logoutLabel: string;
    /** Commandes du client en attente de paiement (calculé côté serveur). */
    awaitingPayment: number;
    awaitingLabel: string;
};

/** Icône compte du header : lien /login si déconnecté, menu sinon, avec badge des paiements en attente. */
export function AccountMenu({
    loginAria,
    accountAria,
    dashboardLabel,
    ordersLabel,
    accountLabel,
    logoutLabel,
    awaitingPayment,
    awaitingLabel,
}: AccountMenuProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    if (isPending) {
        return <div className={iconButtonClass} aria-hidden />;
    }

    if (!session) {
        return (
            <NextLink href="/login" aria-label={loginAria} className={iconButtonClass}>
                <IconUser size={19} />
            </NextLink>
        );
    }

    const role = (session.user as { role?: string }).role;
    const isStaff = role === "ADMIN" || role === "EDITOR";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={awaitingPayment > 0 ? `${accountAria}, ${awaitingLabel}` : accountAria}
                className={iconButtonClass}
            >
                <IconUser size={19} />
                {awaitingPayment > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                        {awaitingPayment}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel className="truncate">{session.user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/account">
                        <IconUserCircle size={16} />
                        {accountLabel}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex w-full items-center">
                        <IconPackage size={16} />
                        <span className="flex-1">{ordersLabel}</span>
                        {awaitingPayment > 0 && (
                            <span className="rounded-full bg-orange-600 px-1.5 text-[10px] font-bold text-white">
                                {awaitingPayment}
                            </span>
                        )}
                    </Link>
                </DropdownMenuItem>
                {isStaff && (
                    <DropdownMenuItem asChild>
                        <NextLink href="/dashboard">
                            <IconLayoutDashboard size={16} />
                            {dashboardLabel}
                        </NextLink>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
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
