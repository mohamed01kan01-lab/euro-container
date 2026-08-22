"use client";

import { useState, useTransition } from "react";
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconLoader2,
    IconMapPin,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import { ZoneDialog } from "./zone-dialog";
import { PickupDialog } from "./pickup-dialog";
import {
    createShippingZone,
    updateShippingZone,
    deleteShippingZone,
    createPickupPoint,
    updatePickupPoint,
    deletePickupPoint,
    type SerializedZone,
    type SerializedPickupPoint,
} from "@/app/(admin)/dashboard/shipping/actions";

interface ShippingTabsProps {
    zones: SerializedZone[];
    points: SerializedPickupPoint[];
    currency: string;
}

export function ShippingTabs({ zones, points, currency }: ShippingTabsProps) {
    const [pending, startTransition] = useTransition();

    const [zoneDialog, setZoneDialog] = useState(false);
    const [editingZone, setEditingZone] = useState<SerializedZone | null>(null);
    const [deletingZone, setDeletingZone] = useState<SerializedZone | null>(
        null,
    );

    const [pointDialog, setPointDialog] = useState(false);
    const [editingPoint, setEditingPoint] =
        useState<SerializedPickupPoint | null>(null);
    const [deletingPoint, setDeletingPoint] =
        useState<SerializedPickupPoint | null>(null);

    function remove(
        label: string,
        action: () => Promise<void>,
        close: () => void,
    ) {
        startTransition(async () => {
            try {
                await action();
                toast.success(`« ${label} » supprimé.`);
                close();
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
        <Tabs defaultValue="zones">
            <TabsList className="mb-6">
                <TabsTrigger value="zones">Secteurs de livraison</TabsTrigger>
                <TabsTrigger value="pickup">Points de retrait</TabsTrigger>
            </TabsList>

            {/* ─── Secteurs ─────────────────────────────────────────────── */}
            <TabsContent value="zones" className="space-y-4">
                <header className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        {zones.length} secteur{zones.length !== 1 ? "s" : ""}
                    </p>
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingZone(null);
                            setZoneDialog(true);
                        }}
                    >
                        <IconPlus size={16} className="mr-2" />
                        Nouveau secteur
                    </Button>
                </header>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {zones.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            Aucun secteur. Sans secteur actif, la livraison à
                            domicile ne sera pas proposée au checkout.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Secteur</TableHead>
                                    <TableHead>Prix</TableHead>
                                    <TableHead>Gratuit au-delà de</TableHead>
                                    <TableHead>Délai</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="w-24" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {zones.map((zone) => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-medium">
                                            {zone.name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatPrice(zone.price, currency)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {zone.freeAbove != null
                                                ? formatPrice(
                                                      zone.freeAbove,
                                                      currency,
                                                  )
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {zone.estimatedDays ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    zone.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {zone.isActive
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <RowActions
                                                    label={zone.name}
                                                    disabled={pending}
                                                >
                                                    <DropdownMenuItem
                                                        onSelect={() => {
                                                            setEditingZone(zone);
                                                            setZoneDialog(true);
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
                                                            setDeletingZone(zone)
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
            </TabsContent>

            {/* ─── Points de retrait ────────────────────────────────────── */}
            <TabsContent value="pickup" className="space-y-4">
                <header className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        {points.length} point{points.length !== 1 ? "s" : ""} de
                        retrait
                    </p>
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingPoint(null);
                            setPointDialog(true);
                        }}
                    >
                        <IconPlus size={16} className="mr-2" />
                        Nouveau point
                    </Button>
                </header>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {points.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            Aucun point de retrait. Le retrait en magasin ne sera
                            pas proposé au checkout.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Adresse</TableHead>
                                    <TableHead>Horaires</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="w-24" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {points.map((point) => (
                                    <TableRow key={point.id}>
                                        <TableCell className="font-medium">
                                            {point.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            <span className="flex items-start gap-1.5">
                                                <IconMapPin
                                                    size={13}
                                                    className="mt-0.5 shrink-0"
                                                />
                                                {point.address}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {point.hours ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    point.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {point.isActive
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <RowActions
                                                    label={point.name}
                                                    disabled={pending}
                                                >
                                                    <DropdownMenuItem
                                                        onSelect={() => {
                                                            setEditingPoint(
                                                                point,
                                                            );
                                                            setPointDialog(true);
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
                                                            setDeletingPoint(
                                                                point,
                                                            )
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
            </TabsContent>

            <ZoneDialog
                open={zoneDialog}
                onOpenChange={setZoneDialog}
                zone={editingZone}
                currency={currency}
                onSubmit={(values) =>
                    editingZone
                        ? updateShippingZone(editingZone.id, values)
                        : createShippingZone(values)
                }
            />

            <PickupDialog
                open={pointDialog}
                onOpenChange={setPointDialog}
                point={editingPoint}
                onSubmit={(values) =>
                    editingPoint
                        ? updatePickupPoint(editingPoint.id, values)
                        : createPickupPoint(values)
                }
            />

            <AlertDialog
                open={!!deletingZone}
                onOpenChange={(o) => !o && setDeletingZone(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer « {deletingZone?.name} » ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Pour cesser de
                            proposer ce secteur sans le perdre, désactivez-le.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (!deletingZone) return;
                                remove(
                                    deletingZone.name,
                                    () => deleteShippingZone(deletingZone.id),
                                    () => setDeletingZone(null),
                                );
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

            <AlertDialog
                open={!!deletingPoint}
                onOpenChange={(o) => !o && setDeletingPoint(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer « {deletingPoint?.name} » ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Pour cesser de
                            proposer ce point sans le perdre, désactivez-le.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (!deletingPoint) return;
                                remove(
                                    deletingPoint.name,
                                    () => deletePickupPoint(deletingPoint.id),
                                    () => setDeletingPoint(null),
                                );
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
        </Tabs>
    );
}
