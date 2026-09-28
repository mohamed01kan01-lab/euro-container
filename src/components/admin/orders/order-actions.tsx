"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconTruck, IconNote } from "@tabler/icons-react";
import type { ShippingStatus } from "@prisma/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SHIPPING_STATUS, SHIPPING_VALUES } from "@/lib/order-status";
import {
    updateShippingStatus,
    updateOrderNotes,
    type OrderDetail,
} from "@/app/(admin)/dashboard/orders/actions";

interface OrderActionsProps {
    order: OrderDetail;
}

export function OrderActions({ order }: OrderActionsProps) {
    const [pending, startTransition] = useTransition();
    const [status, setStatus] = useState<ShippingStatus>(order.shippingStatus);
    const [tracking, setTracking] = useState(order.trackingNumber ?? "");
    const [notes, setNotes] = useState(order.notes ?? "");

    function saveShipping() {
        startTransition(async () => {
            try {
                await updateShippingStatus(order.id, status, tracking);
                toast.success("Livraison mise à jour.");
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La mise à jour a échoué.",
                );
            }
        });
    }

    function saveNotes() {
        startTransition(async () => {
            try {
                await updateOrderNotes(order.id, notes);
                toast.success("Note enregistrée.");
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "L'enregistrement a échoué.",
                );
            }
        });
    }

    return (
        <aside className="space-y-5 rounded-3xl border border-border bg-card p-4">
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Livraison
                </h2>

                <div className="space-y-1.5">
                    <Label htmlFor="shipping-status">Statut</Label>
                    <Select
                        value={status}
                        onValueChange={(v) => setStatus(v as ShippingStatus)}
                    >
                        <SelectTrigger id="shipping-status" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SHIPPING_VALUES.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {SHIPPING_STATUS[s].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="tracking">Numéro de suivi</Label>
                    <Input
                        id="tracking"
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        placeholder="—"
                        className="font-mono text-sm"
                    />
                </div>

                <Button
                    size="sm"
                    className="w-full"
                    disabled={pending}
                    onClick={saveShipping}
                >
                    {pending ? (
                        <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                    ) : (
                        <IconTruck size={15} className="mr-1.5" />
                    )}
                    Enregistrer la livraison
                </Button>
            </section>

            <Separator />

            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes internes
                </h2>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Visible uniquement dans le dashboard…"
                    className="resize-none text-sm"
                />
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={pending}
                    onClick={saveNotes}
                >
                    <IconNote size={15} className="mr-1.5" />
                    Enregistrer la note
                </Button>
            </section>

        </aside>
    );
}
