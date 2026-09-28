"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
    IconBuildingBank,
    IconBuildingStore,
    IconCheck,
    IconCreditCard,
    IconHeadset,
    IconLoader2,
    IconLock,
    IconPhoto,
    IconPlus,
    IconShieldCheck,
    IconTruck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/public/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { taxOf } from "@/lib/tax";
import { MapEmbed } from "@/components/public/map-embed";
import type { CheckoutPaymentMethod } from "@/lib/payment";
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

export interface CheckoutLine {
    key: string;
    name: string;
    variantLabel: string | null;
    image: string | null;
    quantity: number;
    lineTotal: number;
}

interface CheckoutFormProps {
    locale: string;
    lines: CheckoutLine[];
    subtotal: number;
    discount: number;
    couponCode: string | null;
    /** Le coupon « livraison offerte » met les frais à zéro quel que soit le secteur. */
    freeShipping: boolean;
    zones: CheckoutZone[];
    pickupPoints: CheckoutPickup[];
    methods: CheckoutPaymentMethod[];
    currency: string;
    /** Taux de TVA (%) : les montants reçus sont HT, le client paie le TTC. */
    vatRate: number;
    paymentDueDays: number;
    supportPhone: string | null;
    /** Pré-remplissage : session et dernière commande du client connecté. */
    defaults: {
        name: string;
        email: string;
        phone: string;
        company: string;
        vatNumber: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        postalCode: string;
        country: string;
    };
}

const FORM_ID = "checkout-form";

/** UUID v4. randomUUID n'existe qu'en contexte sécurisé (HTTPS ou localhost). */
function newCheckoutKey(): string {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const choiceClass = (active: boolean) =>
    cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
        active
            ? "border-orange-600 bg-orange-600/5"
            : "border-border hover:border-foreground/30",
    );

function Radio({ active }: { active: boolean }) {
    return (
        <span
            aria-hidden
            className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                active ? "border-orange-600 bg-orange-600 text-white" : "border-border",
            )}
        >
            {active && <IconCheck size={12} stroke={3} />}
        </span>
    );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[26px] border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-3 font-display text-lg">
                <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                    {n}
                </span>
                {title}
            </h2>
            {children}
        </section>
    );
}

export function CheckoutForm({
    locale,
    lines,
    subtotal,
    discount,
    couponCode,
    freeShipping,
    zones,
    pickupPoints,
    methods,
    currency,
    vatRate,
    paymentDueDays,
    supportPhone,
    defaults,
}: CheckoutFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [redirecting, setRedirecting] = useState(false);
    // Clé d'idempotence : fixe pour toute la vie de la page, un double envoi
    // renvoie la même commande côté serveur.
    const [checkoutKey] = useState(newCheckoutKey);

    const [shippingMethod, setShippingMethod] = useState<"DELIVERY" | "PICKUP">(
        zones.length > 0 ? "DELIVERY" : "PICKUP",
    );
    const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
    const [pickupId, setPickupId] = useState(pickupPoints[0]?.id ?? "");
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(methods[0]);
    const [showNotes, setShowNotes] = useState(false);
    const [showCompany, setShowCompany] = useState(!!defaults.company);

    const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
    const selectedPickup = pickupPoints.find((p) => p.id === pickupId) ?? null;
    const afterDiscount = Math.max(0, subtotal - discount);

    // Aperçu seulement : le montant qui fera foi est recalculé côté serveur.
    const shippingCost =
        shippingMethod === "PICKUP" || freeShipping || !selectedZone
            ? 0
            : selectedZone.freeAbove !== null && afterDiscount >= selectedZone.freeAbove
              ? 0
              : selectedZone.price;
    const totalHt = afterDiscount + shippingCost;
    const tax = taxOf(totalHt, vatRate);
    const total = Math.round((totalHt + tax) * 100) / 100;
    const busy = pending || redirecting;

    // Libellés conformes à l'article L221-14 du Code de la consommation : le
    // bouton doit indiquer sans ambiguïté que la commande oblige à payer.
    const ctaLabel =
        paymentMethod === "STRIPE"
            ? `Payer ${formatPrice(total, currency)}`
            : "Commander et payer par virement";

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        const field = (name: string) => String(form.get(name) ?? "");

        startTransition(async () => {
            const result = await placeOrder({
                checkoutKey,
                locale,
                customerName: field("customerName"),
                customerEmail: field("customerEmail"),
                customerPhone: field("customerPhone"),
                company: field("company"),
                vatNumber: field("vatNumber"),
                shippingMethod,
                shippingZoneId: shippingMethod === "DELIVERY" ? zoneId : undefined,
                pickupPointId: shippingMethod === "PICKUP" ? pickupId : undefined,
                addressLine1: field("addressLine1"),
                addressLine2: field("addressLine2"),
                city: field("city"),
                postalCode: field("postalCode"),
                country: field("country"),
                paymentMethod,
                notes: field("notes"),
            });

            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            setRedirecting(true);
            if (result.redirectUrl) {
                window.location.assign(result.redirectUrl);
            } else {
                router.push(`/order/${result.orderNumber}`);
            }
        });
    }

    const submitButton = (className?: string) => (
        <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            variant="accent"
            disabled={busy}
            className={className}
        >
            {busy ? (
                <IconLoader2 className="animate-spin" />
            ) : paymentMethod === "STRIPE" ? (
                <IconLock />
            ) : null}
            {redirecting && paymentMethod === "STRIPE" ? "Paiement sécurisé…" : ctaLabel}
        </Button>
    );

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
            <form id={FORM_ID} onSubmit={onSubmit} className="space-y-5">
                {/* ─── 1. Coordonnées ───────────────────────────────────── */}
                <Step n={1} title="Vos coordonnées">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="customerName">Nom complet</Label>
                            <Input id="customerName" name="customerName" autoComplete="name" required defaultValue={defaults.name} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="customerPhone">Téléphone</Label>
                            <Input id="customerPhone" name="customerPhone" type="tel" autoComplete="tel" required minLength={6} placeholder="+33 6 12 34 56 78" defaultValue={defaults.phone} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="customerEmail">Email</Label>
                            <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" required defaultValue={defaults.email} />
                            <p className="text-xs text-muted-foreground">
                                Votre confirmation et le suivi de commande y seront envoyés.
                            </p>
                        </div>
                        {showCompany ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="company">Société</Label>
                                    <Input id="company" name="company" autoComplete="organization" autoFocus={!defaults.company} defaultValue={defaults.company} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="vatNumber">
                                        N° TVA intracommunautaire <span className="font-normal text-muted-foreground">(facultatif)</span>
                                    </Label>
                                    <Input id="vatNumber" name="vatNumber" autoComplete="off" placeholder="FR12345678901" className="uppercase" defaultValue={defaults.vatNumber} />
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowCompany(true)}
                                className="inline-flex items-center gap-1.5 justify-self-start text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                <IconPlus size={15} /> J&apos;achète pour une société
                            </button>
                        )}
                    </div>
                </Step>

                {/* ─── 2. Livraison ─────────────────────────────────────── */}
                <Step n={2} title="Livraison">
                    {zones.length > 0 && pickupPoints.length > 0 && (
                        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
                            {(
                                [
                                    ["DELIVERY", "Livraison", IconTruck],
                                    ["PICKUP", "Retrait sur dépôt", IconBuildingStore],
                                ] as const
                            ).map(([value, label, Icon]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={shippingMethod === value}
                                    onClick={() => setShippingMethod(value)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors",
                                        shippingMethod === value
                                            ? "bg-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Icon size={16} /> {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {shippingMethod === "DELIVERY" ? (
                        <div className="space-y-5">
                            <div className="space-y-2" role="radiogroup" aria-label="Secteur de livraison">
                                {zones.map((zone) => {
                                    const free =
                                        freeShipping ||
                                        (zone.freeAbove !== null && afterDiscount >= zone.freeAbove);
                                    return (
                                        <label key={zone.id} className={cn(choiceClass(zoneId === zone.id), "items-center")}>
                                            <input type="radio" name="zone" value={zone.id} checked={zoneId === zone.id} onChange={() => setZoneId(zone.id)} className="sr-only" />
                                            <Radio active={zoneId === zone.id} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold">{zone.name}</span>
                                                {zone.estimatedDays && (
                                                    <span className="block text-xs text-muted-foreground">{zone.estimatedDays}</span>
                                                )}
                                            </span>
                                            <span className={cn("text-sm font-semibold", free && "text-green-600")}>
                                                {free ? "Offerte" : `${formatPrice(zone.price, currency)} HT`}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-6">
                                <div className="space-y-1.5 sm:col-span-6">
                                    <Label htmlFor="addressLine1">Adresse de livraison</Label>
                                    <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" required defaultValue={defaults.addressLine1} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-6">
                                    <Label htmlFor="addressLine2">
                                        Complément <span className="font-normal text-muted-foreground">(accès, portail, zone…)</span>
                                    </Label>
                                    <Input id="addressLine2" name="addressLine2" autoComplete="address-line2" defaultValue={defaults.addressLine2} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="postalCode">Code postal</Label>
                                    <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={defaults.postalCode} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-4">
                                    <Label htmlFor="city">Ville</Label>
                                    <Input id="city" name="city" autoComplete="address-level2" required defaultValue={defaults.city} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-6">
                                    <Label htmlFor="country">Pays</Label>
                                    <Input id="country" name="country" autoComplete="country-name" defaultValue={defaults.country || "France"} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-2" role="radiogroup" aria-label="Point de retrait">
                                {pickupPoints.map((point) => (
                                    <label key={point.id} className={choiceClass(pickupId === point.id)}>
                                        <input type="radio" name="pickup" value={point.id} checked={pickupId === point.id} onChange={() => setPickupId(point.id)} className="sr-only" />
                                        <Radio active={pickupId === point.id} />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">{point.name}</span>
                                            <span className="block text-xs text-muted-foreground">{point.address}</span>
                                            {point.hours && <span className="block text-xs text-muted-foreground">{point.hours}</span>}
                                            {point.details && <span className="mt-1 block text-xs text-muted-foreground">{point.details}</span>}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {/* Carte construite à partir de l'adresse, sans URL stockée. */}
                            {selectedPickup && (
                                <div className="overflow-hidden rounded-[20px] border border-border">
                                    <MapEmbed
                                        key={selectedPickup.id}
                                        address={selectedPickup.address}
                                        title={`Emplacement de ${selectedPickup.name}`}
                                        className="h-52"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </Step>

                {/* ─── 3. Paiement ──────────────────────────────────────── */}
                <Step n={3} title="Paiement">
                    <div className="space-y-2" role="radiogroup" aria-label="Moyen de paiement">
                        {methods.includes("STRIPE") && (
                            <label className={choiceClass(paymentMethod === "STRIPE")}>
                                <input type="radio" name="payment" value="STRIPE" checked={paymentMethod === "STRIPE"} onChange={() => setPaymentMethod("STRIPE")} className="sr-only" />
                                <Radio active={paymentMethod === "STRIPE"} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                        <IconCreditCard size={17} /> Carte bancaire
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        Commande confirmée immédiatement. CB, Visa, Mastercard, Apple Pay, Google Pay.
                                    </span>
                                </span>
                            </label>
                        )}
                        {methods.includes("BANK_TRANSFER") && (
                            <label className={choiceClass(paymentMethod === "BANK_TRANSFER")}>
                                <input type="radio" name="payment" value="BANK_TRANSFER" checked={paymentMethod === "BANK_TRANSFER"} onChange={() => setPaymentMethod("BANK_TRANSFER")} className="sr-only" />
                                <Radio active={paymentMethod === "BANK_TRANSFER"} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                        <IconBuildingBank size={17} /> Virement bancaire
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        Sans frais. Votre commande est réservée {paymentDueDays} jours, RIB et QR code fournis immédiatement.
                                    </span>
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="mt-5">
                        {showNotes ? (
                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Note pour la commande</Label>
                                <Textarea id="notes" name="notes" rows={3} maxLength={1000} className="resize-none" autoFocus placeholder="Conditions d'accès au terrain, créneau souhaité, grue sur place…" />
                            </div>
                        ) : (
                            <button type="button" onClick={() => setShowNotes(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                                <IconPlus size={15} /> Ajouter une note (accès, créneau…)
                            </button>
                        )}
                    </div>
                </Step>

                {/* Information précontractuelle : visible aussi sur mobile, où
                    le bouton est dans la barre fixe. */}
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                    En validant votre commande, vous acceptez nos{" "}
                    <Link href="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-2">
                        conditions générales de vente
                    </Link>{" "}
                    et notre{" "}
                    <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-2">
                        politique de confidentialité
                    </Link>
                    . Particulier, vous disposez d&apos;un délai de 14 jours pour vous rétracter à compter de la réception de votre commande.
                </p>
            </form>

            {/* ─── Récapitulatif ─────────────────────────────────────────── */}
            <aside className="space-y-5 rounded-[30px] border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                    Votre commande
                </p>

                <ul className="space-y-3">
                    {lines.map((line) => (
                        <li key={line.key} className="flex items-center gap-3 text-sm">
                            <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                                {line.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={line.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center">
                                        <IconPhoto size={16} className="text-muted-foreground" />
                                    </span>
                                )}
                                {line.quantity > 1 && (
                                    <span className="absolute right-0.5 top-0.5 rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                                        {line.quantity}
                                    </span>
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 font-medium">{line.name}</span>
                                {line.variantLabel && (
                                    <span className="block text-xs text-muted-foreground">{line.variantLabel}</span>
                                )}
                            </span>
                            <span className="whitespace-nowrap font-medium">
                                {formatPrice(line.lineTotal, currency)}
                                <span className="ml-1 text-xs font-normal text-muted-foreground">HT</span>
                            </span>
                        </li>
                    ))}
                </ul>

                <Separator />

                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Sous-total HT</dt>
                        <dd>{formatPrice(subtotal, currency)}</dd>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <dt>Remise{couponCode ? ` (${couponCode})` : ""}</dt>
                            <dd>−{formatPrice(discount, currency)}</dd>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                            {shippingMethod === "PICKUP" ? "Retrait sur dépôt" : "Livraison"}
                        </dt>
                        <dd className={cn(shippingCost === 0 && "font-medium text-green-600")}>
                            {shippingCost === 0 ? "Offerte" : `${formatPrice(shippingCost, currency)} HT`}
                        </dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Total HT</dt>
                        <dd>{formatPrice(totalHt, currency)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">TVA ({vatRate} %)</dt>
                        <dd>{formatPrice(tax, currency)}</dd>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-baseline justify-between">
                        <dt className="font-semibold">Total TTC</dt>
                        <dd className="font-display text-3xl text-orange-600">{formatPrice(total, currency)}</dd>
                    </div>
                </dl>

                <div className="hidden lg:block">
                    {submitButton("w-full")}
                    {paymentMethod === "BANK_TRANSFER" && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            Vous recevez le RIB et un QR code immédiatement, votre commande est réservée {paymentDueDays} jours.
                        </p>
                    )}
                </div>

                <ul className="space-y-2.5 border-t border-border pt-5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2.5">
                        <IconLock size={16} className="shrink-0 text-foreground" />
                        {methods.includes("STRIPE")
                            ? "Paiement sécurisé par Stripe : votre carte n'est jamais saisie sur notre site"
                            : "Commande sécurisée, confirmée par email"}
                    </li>
                    <li className="flex items-center gap-2.5">
                        <IconShieldCheck size={16} className="shrink-0 text-foreground" />
                        Annulation gratuite tant que la commande n&apos;est pas payée
                    </li>
                    {supportPhone && (
                        <li className="flex items-center gap-2.5">
                            <IconHeadset size={16} className="shrink-0 text-foreground" />
                            <span>
                                Une question ? <a href={`tel:${supportPhone}`} className="font-semibold text-foreground">{supportPhone}</a>
                            </span>
                        </li>
                    )}
                </ul>
            </aside>

            {/* ─── Barre d'action mobile ─────────────────────────────────── */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Total TTC</p>
                        <p className="font-display text-xl leading-tight text-orange-600">{formatPrice(total, currency)}</p>
                    </div>
                    {submitButton("min-w-0 flex-1 max-w-xs whitespace-normal text-center leading-tight")}
                </div>
            </div>
        </div>
    );
}
