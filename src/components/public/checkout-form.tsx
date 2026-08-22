"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { IconLoader2, IconTruck, IconBuildingStore } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import { mapEmbedUrl } from "@/lib/maps";
import { PAYMENT_LABELS, PAYMENT_HINTS, type PaymentMethodValue } from "@/lib/payment";
import { placeOrder } from "@/app/[locale]/(public)/checkout/actions";

export interface CheckoutZone {
    id: string;
    name: string;
    price: number;
    freeAbove: number | null;
    estimatedDays: string | null;
}

export interface CheckoutPickup {
    id: string;
    name: string;
    address: string;
    details: string | null;
    hours: string | null;
}

interface CheckoutFormProps {
    zones: CheckoutZone[];
    pickupPoints: CheckoutPickup[];
    methods: PaymentMethodValue[];
    currency: string;
    subtotalAfterDiscount: number;
    defaults: { name: string; email: string };
    /** Le coupon « livraison offerte » met les frais à zéro quel que soit le secteur. */
    freeShipping: boolean;
}

export function CheckoutForm({
    zones,
    pickupPoints,
    methods,
    currency,
    subtotalAfterDiscount,
    defaults,
    freeShipping,
}: CheckoutFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const [shippingMethod, setShippingMethod] = useState<"DELIVERY" | "PICKUP">(
        zones.length > 0 ? "DELIVERY" : "PICKUP",
    );
    const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
    const [pickupId, setPickupId] = useState(pickupPoints[0]?.id ?? "");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(
        methods[0],
    );

    const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
    const selectedPickup = pickupPoints.find((p) => p.id === pickupId) ?? null;

    // Aperçu seulement : le montant qui fera foi est recalculé côté serveur.
    const shippingCost =
        shippingMethod === "PICKUP" || freeShipping
            ? 0
            : selectedZone
              ? selectedZone.freeAbove !== null &&
                subtotalAfterDiscount >= selectedZone.freeAbove
                  ? 0
                  : selectedZone.price
              : 0;

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                const { orderNumber } = await placeOrder({
                    customerName: String(form.get("customerName") ?? ""),
                    customerEmail: String(form.get("customerEmail") ?? ""),
                    customerPhone: String(form.get("customerPhone") ?? ""),
                    shippingMethod,
                    shippingZoneId: shippingMethod === "DELIVERY" ? zoneId : undefined,
                    pickupPointId: shippingMethod === "PICKUP" ? pickupId : undefined,
                    addressLine1: String(form.get("addressLine1") ?? ""),
                    addressLine2: String(form.get("addressLine2") ?? ""),
                    city: String(form.get("city") ?? ""),
                    postalCode: String(form.get("postalCode") ?? ""),
                    country: String(form.get("country") ?? ""),
                    paymentMethod,
                    notes: String(form.get("notes") ?? ""),
                });
                router.push(`/order/${orderNumber}`);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La commande n'a pas pu être enregistrée.",
                );
            }
        });
    }

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* ─── Coordonnées ─────────────────────────────────────────── */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Vos coordonnées</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="customerName">Nom complet</Label>
                        <Input
                            id="customerName"
                            name="customerName"
                            required
                            defaultValue={defaults.name}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                            id="customerEmail"
                            name="customerEmail"
                            type="email"
                            required
                            defaultValue={defaults.email}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="customerPhone">Téléphone</Label>
                        <Input
                            id="customerPhone"
                            name="customerPhone"
                            type="tel"
                            placeholder="+229 …"
                        />
                    </div>
                </div>
            </section>

            {/* ─── Livraison ───────────────────────────────────────────── */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Livraison</h2>

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        disabled={zones.length === 0}
                        aria-pressed={shippingMethod === "DELIVERY"}
                        onClick={() => setShippingMethod("DELIVERY")}
                        className={
                            shippingMethod === "DELIVERY"
                                ? "flex items-center gap-2 rounded-lg border-2 border-primary p-3 text-sm font-medium"
                                : "flex items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/40 disabled:pointer-events-none disabled:opacity-50"
                        }
                    >
                        <IconTruck size={17} />
                        Livraison à domicile
                    </button>

                    <button
                        type="button"
                        disabled={pickupPoints.length === 0}
                        aria-pressed={shippingMethod === "PICKUP"}
                        onClick={() => setShippingMethod("PICKUP")}
                        className={
                            shippingMethod === "PICKUP"
                                ? "flex items-center gap-2 rounded-lg border-2 border-primary p-3 text-sm font-medium"
                                : "flex items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/40 disabled:pointer-events-none disabled:opacity-50"
                        }
                    >
                        <IconBuildingStore size={17} />
                        Retrait en magasin
                    </button>
                </div>

                {shippingMethod === "DELIVERY" ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Secteur</Label>
                            <div className="space-y-2">
                                {zones.map((zone) => (
                                    <label
                                        key={zone.id}
                                        className={
                                            zoneId === zone.id
                                                ? "flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 border-primary p-3"
                                                : "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                                        }
                                    >
                                        <span className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="zone"
                                                value={zone.id}
                                                checked={zoneId === zone.id}
                                                onChange={() => setZoneId(zone.id)}
                                                className="sr-only"
                                            />
                                            <span>
                                                <span className="block text-sm font-medium">
                                                    {zone.name}
                                                </span>
                                                {zone.estimatedDays && (
                                                    <span className="block text-xs text-muted-foreground">
                                                        {zone.estimatedDays}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                        <span className="text-sm font-medium">
                                            {formatPrice(zone.price, currency)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="addressLine1">Adresse</Label>
                                <Input
                                    id="addressLine1"
                                    name="addressLine1"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="addressLine2">
                                    Complément d&apos;adresse
                                </Label>
                                <Input id="addressLine2" name="addressLine2" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="city">Ville</Label>
                                <Input id="city" name="city" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="postalCode">Code postal</Label>
                                <Input id="postalCode" name="postalCode" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pickupPoints.map((point) => (
                            <label
                                key={point.id}
                                className={
                                    pickupId === point.id
                                        ? "block cursor-pointer rounded-lg border-2 border-primary p-3"
                                        : "block cursor-pointer rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                                }
                            >
                                <input
                                    type="radio"
                                    name="pickup"
                                    value={point.id}
                                    checked={pickupId === point.id}
                                    onChange={() => setPickupId(point.id)}
                                    className="sr-only"
                                />
                                <span className="block text-sm font-medium">
                                    {point.name}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {point.address}
                                </span>
                                {point.hours && (
                                    <span className="block text-xs text-muted-foreground">
                                        {point.hours}
                                    </span>
                                )}
                                {point.details && (
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                        {point.details}
                                    </span>
                                )}
                            </label>
                        ))}

                        {/* Carte construite à partir de l'adresse, sans URL stockée. */}
                        {selectedPickup && (
                            <div className="overflow-hidden rounded-xl border border-border">
                                <iframe
                                    key={selectedPickup.id}
                                    src={mapEmbedUrl(selectedPickup.address)}
                                    title={`Emplacement de ${selectedPickup.name}`}
                                    loading="lazy"
                                    className="h-56 w-full"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ─── Paiement ────────────────────────────────────────────── */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Paiement</h2>

                <div className="space-y-2">
                    {methods.map((method) => (
                        <label
                            key={method}
                            className={
                                paymentMethod === method
                                    ? "block cursor-pointer rounded-lg border-2 border-primary p-3"
                                    : "block cursor-pointer rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                            }
                        >
                            <input
                                type="radio"
                                name="payment"
                                value={method}
                                checked={paymentMethod === method}
                                onChange={() => setPaymentMethod(method)}
                                className="sr-only"
                            />
                            <span className="block text-sm font-medium">
                                {PAYMENT_LABELS[method]}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {PAYMENT_HINTS[method]}
                            </span>
                        </label>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="notes">Note pour la commande</Label>
                    <Textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        className="resize-none"
                        placeholder="Instructions de livraison, précisions…"
                    />
                </div>
            </section>

            <Separator />

            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Frais de livraison :{" "}
                    <span className="font-medium text-foreground">
                        {shippingCost === 0
                            ? "offerts"
                            : formatPrice(shippingCost, currency)}
                    </span>
                </p>

                <Button type="submit" size="lg" variant="accent" disabled={pending}>
                    {pending && (
                        <IconLoader2 size={17} className="mr-2 animate-spin" />
                    )}
                    Confirmer la commande
                </Button>
            </div>
        </form>
    );
}
