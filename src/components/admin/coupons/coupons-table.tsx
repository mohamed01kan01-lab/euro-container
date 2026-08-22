"use client";

import { useState, useTransition } from "react";
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconLoader2,
    IconInfinity,
    IconTicketOff,
} from "@tabler/icons-react";
import type { CouponType } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import { CouponDialog } from "./coupon-dialog";
import {
    createCoupon,
    updateCoupon,
    toggleCoupon,
    deleteCoupon,
    type SerializedCoupon,
} from "@/app/(admin)/dashboard/coupons/actions";

const TYPE_LABELS: Record<CouponType, string> = {
    PERCENTAGE: "Pourcentage",
    FIXED: "Montant fixe",
    FREE_SHIPPING: "Livraison offerte",
};

function formatValue(coupon: SerializedCoupon, currency: string) {
    if (coupon.type === "FREE_SHIPPING") return "—";
    if (coupon.type === "PERCENTAGE") return `${coupon.value} %`;
    return formatPrice(coupon.value, currency);
}

function formatWindow(coupon: SerializedCoupon) {
    const fmt = (iso: string) =>
        new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(iso));

    if (!coupon.startsAt && !coupon.expiresAt) return "Toujours valide";
    if (coupon.startsAt && coupon.expiresAt) {
        return `${fmt(coupon.startsAt)} → ${fmt(coupon.expiresAt)}`;
    }
    if (coupon.startsAt) return `Dès le ${fmt(coupon.startsAt)}`;
    return `Jusqu'au ${fmt(coupon.expiresAt!)}`;
}

/** Un coupon peut être actif mais hors de sa fenêtre de validité ou épuisé. */
function isUsable(coupon: SerializedCoupon) {
    if (!coupon.isActive) return false;
    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now)
        return false;
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now)
        return false;
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
        return false;
    return true;
}

interface CouponsTableProps {
    coupons: SerializedCoupon[];
    products: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    currency: string;
}

export function CouponsTable({
    coupons,
    products,
    categories,
    currency,
}: CouponsTableProps) {
    const [pending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<SerializedCoupon | null>(null);
    const [deleting, setDeleting] = useState<SerializedCoupon | null>(null);

    function handleToggle(coupon: SerializedCoupon, next: boolean) {
        startTransition(async () => {
            try {
                await toggleCoupon(coupon.id, next);
                toast.success(
                    next
                        ? `« ${coupon.code} » activé.`
                        : `« ${coupon.code} » désactivé.`,
                );
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La mise à jour a échoué.",
                );
            }
        });
    }

    function handleDelete() {
        if (!deleting) return;
        const target = deleting;
        startTransition(async () => {
            try {
                await deleteCoupon(target.id);
                toast.success(`« ${target.code} » supprimé.`);
                setDeleting(null);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La suppression a échoué.",
                );
            }
        });
    }

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {coupons.length} coupon{coupons.length !== 1 ? "s" : ""}
                </p>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                    }}
                >
                    <IconPlus size={16} className="mr-2" />
                    Nouveau coupon
                </Button>
            </header>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {coupons.length === 0 ? (
                    <EmptyState
                        icon={IconTicketOff}
                        title="Aucun coupon"
                        description="Créez un code promo pour l'offrir à vos clients."
                        action={
                            <Button
                                size="sm"
                                onClick={() => {
                                    setEditing(null);
                                    setDialogOpen(true);
                                }}
                            >
                                Nouveau coupon
                            </Button>
                        }
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Valeur</TableHead>
                                <TableHead>Utilisations</TableHead>
                                <TableHead>Validité</TableHead>
                                <TableHead>Actif</TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-mono font-medium">
                                        <span className="flex items-center gap-2">
                                            {coupon.code}
                                            {!isUsable(coupon) && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs font-sans font-normal text-muted-foreground"
                                                >
                                                    inutilisable
                                                </Badge>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {TYPE_LABELS[coupon.type]}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">
                                        {formatValue(coupon, currency)}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">
                                        <span className="flex items-center gap-1">
                                            {coupon.usedCount}
                                            <span className="text-muted-foreground">
                                                /
                                            </span>
                                            {coupon.maxUses != null ? (
                                                coupon.maxUses
                                            ) : (
                                                <IconInfinity
                                                    size={14}
                                                    className="text-muted-foreground"
                                                />
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatWindow(coupon)}
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={coupon.isActive}
                                            disabled={pending}
                                            onCheckedChange={(v) =>
                                                handleToggle(coupon, v)
                                            }
                                            aria-label={`Activer ${coupon.code}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <RowActions
                                                label={coupon.code}
                                                disabled={pending}
                                            >
                                                <DropdownMenuItem
                                                    onSelect={() => {
                                                        setEditing(coupon);
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <IconEdit
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Modifier
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        setDeleting(coupon)
                                                    }
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                >
                                                    <IconTrash
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </RowActions>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <CouponDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                coupon={editing}
                products={products}
                categories={categories}
                currency={currency}
                onSubmit={(values) =>
                    editing ? updateCoupon(editing.id, values) : createCoupon(values)
                }
            />

            <AlertDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer « {deleting?.code} » ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Pour conserver
                            l&apos;historique, préférez la désactivation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
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
        </section>
    );
}
