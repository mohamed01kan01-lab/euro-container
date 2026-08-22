"use client";

import { useState, useTransition } from "react";
import {
    IconTrash,
    IconLoader2,
    IconBan,
    IconCircleCheck,
    IconKey,
    IconUserShield,
    IconMailExclamation,
    IconUsersGroup,
} from "@tabler/icons-react";
import type { Role } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import {
    StatusBadge,
    type StatusTone,
} from "@/components/admin/ui/status-badge";
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
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_VALUES } from "@/lib/roles";
import { UserPasswordDialog } from "./user-password-dialog";
import {
    banUser,
    unbanUser,
    removeUser,
    setUserRole,
} from "@/app/(admin)/dashboard/users/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: Role;
    banned: boolean | null;
    banReason: string | null;
    emailVerified: boolean;
    createdAt: Date;
}

// ─── Config ───────────────────────────────────────────────────────────────────

// Couleurs de la spec 3.11 : Admin bleu, Éditeur violet, Client gris.
const ROLE_TONES: Record<Role, StatusTone> = {
    ADMIN: "info",
    EDITOR: "accent",
    CLIENT: "neutral",
};

function initials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UsersTableProps {
    users: User[];
    canWrite: boolean;
    currentUserId: string;
}

export function UsersTable({ users, canWrite, currentUserId }: UsersTableProps) {
    const [pending, startTransition] = useTransition();
    const [deleteUser, setDeleteUser] = useState<User | null>(null);
    const [passwordUser, setPasswordUser] = useState<User | null>(null);

    function run(action: () => Promise<void>, successMessage: string) {
        startTransition(async () => {
            try {
                await action();
                toast.success(successMessage);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "L'action a échoué. Réessayez.",
                );
            }
        });
    }

    function handleDelete() {
        if (!deleteUser) return;
        const user = deleteUser;
        startTransition(async () => {
            try {
                await removeUser(user.id);
                toast.success(`${user.name} a été supprimé.`);
                setDeleteUser(null);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Impossible de supprimer cet utilisateur.",
                );
            }
        });
    }

    if (users.length === 0) {
        return (
            <EmptyState
                icon={IconUsersGroup}
                title="Aucun utilisateur"
                description="Aucun compte ne correspond à ces critères. Ajustez les filtres ou créez un utilisateur."
            />
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Inscription</TableHead>
                        {canWrite && <TableHead className="w-10" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => {
                        const isSelf = user.id === currentUserId;
                        return (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            {user.image && (
                                                <AvatarImage
                                                    src={user.image}
                                                    alt=""
                                                />
                                            )}
                                            <AvatarFallback className="text-xs">
                                                {initials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">
                                                {user.name}
                                                {isSelf && (
                                                    <span className="text-xs text-muted-foreground font-normal ml-1.5">
                                                        (vous)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <StatusBadge tone={ROLE_TONES[user.role]}>
                                        {ROLE_LABELS[user.role]}
                                    </StatusBadge>
                                </TableCell>

                                <TableCell>
                                    {user.banned ? (
                                        <StatusBadge
                                            tone="danger"
                                            icon={<IconBan size={12} />}
                                            title={user.banReason ?? undefined}
                                        >
                                            Suspendu
                                        </StatusBadge>
                                    ) : user.emailVerified ? (
                                        <StatusBadge
                                            tone="success"
                                            icon={<IconCircleCheck size={12} />}
                                        >
                                            Actif
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge
                                            tone="warning"
                                            icon={<IconMailExclamation size={12} />}
                                        >
                                            Non vérifié
                                        </StatusBadge>
                                    )}
                                </TableCell>

                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Intl.DateTimeFormat("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    }).format(user.createdAt)}
                                </TableCell>

                                {canWrite && (
                                    <TableCell>
                                        <RowActions label={user.name}>
                                                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                                                    <IconUserShield size={13} />
                                                    Changer le rôle
                                                </DropdownMenuLabel>
                                                {ROLE_VALUES.filter(
                                                    (r) => r !== user.role,
                                                ).map((r) => (
                                                    <DropdownMenuItem
                                                        key={r}
                                                        disabled={
                                                            pending || isSelf
                                                        }
                                                        onSelect={() =>
                                                            run(
                                                                () =>
                                                                    setUserRole(
                                                                        user.id,
                                                                        r,
                                                                    ),
                                                                `${user.name} est maintenant ${ROLE_LABELS[r]}.`,
                                                            )
                                                        }
                                                    >
                                                        Passer en{" "}
                                                        {ROLE_LABELS[r]}
                                                    </DropdownMenuItem>
                                                ))}

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    disabled={pending}
                                                    onSelect={() =>
                                                        setPasswordUser(user)
                                                    }
                                                >
                                                    <IconKey
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Réinitialiser le mot de passe
                                                </DropdownMenuItem>

                                                {user.banned ? (
                                                    <DropdownMenuItem
                                                        disabled={pending}
                                                        onSelect={() =>
                                                            run(
                                                                () =>
                                                                    unbanUser(
                                                                        user.id,
                                                                    ),
                                                                `${user.name} a été réactivé.`,
                                                            )
                                                        }
                                                    >
                                                        <IconCircleCheck
                                                            size={14}
                                                            className="mr-2"
                                                        />
                                                        Réactiver le compte
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        disabled={
                                                            pending || isSelf
                                                        }
                                                        onSelect={() =>
                                                            run(
                                                                () =>
                                                                    banUser(
                                                                        user.id,
                                                                    ),
                                                                `${user.name} a été suspendu.`,
                                                            )
                                                        }
                                                    >
                                                        <IconBan
                                                            size={14}
                                                            className="mr-2"
                                                        />
                                                        Suspendre le compte
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    disabled={pending || isSelf}
                                                    onSelect={() =>
                                                        setDeleteUser(user)
                                                    }
                                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                >
                                                    <IconTrash
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Supprimer
                                                </DropdownMenuItem>
                                        </RowActions>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <AlertDialog
                open={!!deleteUser}
                onOpenChange={(o) => !o && setDeleteUser(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer {deleteUser?.name} ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le compte et ses
                            sessions seront définitivement supprimés. Pour
                            conserver l&apos;historique, préférez la suspension.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                // Garde le dialog ouvert pendant la suppression (spinner visible)
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={pending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {pending && (
                                <IconLoader2
                                    size={14}
                                    className="mr-1.5 animate-spin"
                                />
                            )}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <UserPasswordDialog
                user={passwordUser}
                onClose={() => setPasswordUser(null)}
            />
        </>
    );
}
