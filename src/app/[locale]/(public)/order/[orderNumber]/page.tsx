import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import {
    IconCircleCheck,
    IconBuildingStore,
    IconTruck,
    IconInfoCircle,
} from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { formatPrice } from "@/lib/currency";
import { mapEmbedUrl } from "@/lib/maps";
import {
    PAYMENT_LABELS,
    paymentInstructions,
    isPaymentMethod,
} from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
    title: "Commande confirmée",
    robots: { index: false, follow: false },
};

interface PageProps {
    params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
    const { orderNumber } = await params;

    const [order, settings] = await Promise.all([
        prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: true,
                pickupPoint: true,
                shippingZone: { select: { name: true, estimatedDays: true } },
            },
        }),
        getSiteSettings(),
    ]);

    if (!order) notFound();

    const { currency } = order;
    const instructions =
        order.paymentMethod && isPaymentMethod(order.paymentMethod)
            ? paymentInstructions(order.paymentMethod, settings)
            : null;

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            <header className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <IconCircleCheck size={28} className="text-primary" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight">
                    Merci, votre commande est enregistrée
                </h1>
                <p className="text-sm text-muted-foreground">
                    Numéro de commande :{" "}
                    <span className="font-mono font-medium text-foreground">
                        {order.orderNumber}
                    </span>
                </p>
            </header>

            {/* Instructions de paiement : sans elles, un virement ou un
                Mobile Money n'aboutirait jamais. */}
            {instructions && (
                <section className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <IconInfoCircle size={16} className="text-primary" />
                        Comment régler votre commande
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {instructions}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Indiquez le numéro {order.orderNumber} lors de votre
                        paiement.
                    </p>
                </section>
            )}

            <section className="mt-8 rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Récapitulatif</h2>

                <ul className="mt-4 space-y-3">
                    {order.items.map((item) => (
                        <li
                            key={item.id}
                            className="flex justify-between gap-3 text-sm"
                        >
                            <span className="min-w-0">
                                <span className="block">{item.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    ×{item.quantity}
                                </span>
                            </span>
                            <span className="whitespace-nowrap">
                                {formatPrice(
                                    Number(item.price) * item.quantity,
                                    currency,
                                )}
                            </span>
                        </li>
                    ))}
                </ul>

                <Separator className="my-4" />

                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <dt>Sous-total</dt>
                        <dd>{formatPrice(Number(order.subtotal), currency)}</dd>
                    </div>
                    {Number(order.discount) > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <dt>Remise</dt>
                            <dd>
                                −{formatPrice(Number(order.discount), currency)}
                            </dd>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <dt>Livraison</dt>
                        <dd>
                            {Number(order.shippingCost) === 0
                                ? "Offerte"
                                : formatPrice(
                                      Number(order.shippingCost),
                                      currency,
                                  )}
                        </dd>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-semibold">
                        <dt>Total</dt>
                        <dd>{formatPrice(Number(order.total), currency)}</dd>
                    </div>
                </dl>

                {order.paymentMethod && isPaymentMethod(order.paymentMethod) && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Moyen de paiement :{" "}
                        {PAYMENT_LABELS[order.paymentMethod]}
                    </p>
                )}
            </section>

            <section className="mt-6 rounded-xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {order.shippingMethod === "PICKUP" ? (
                        <>
                            <IconBuildingStore size={16} />
                            Retrait en magasin
                        </>
                    ) : (
                        <>
                            <IconTruck size={16} />
                            Livraison
                        </>
                    )}
                </h2>

                {order.shippingMethod === "PICKUP" && order.pickupPoint ? (
                    <div className="mt-3 space-y-3">
                        <div className="text-sm">
                            <p className="font-medium">
                                {order.pickupPoint.name}
                            </p>
                            <p className="text-muted-foreground">
                                {order.pickupPoint.address}
                            </p>
                            {order.pickupPoint.hours && (
                                <p className="text-muted-foreground">
                                    {order.pickupPoint.hours}
                                </p>
                            )}
                            {order.pickupPoint.details && (
                                <p className="mt-1 text-muted-foreground">
                                    {order.pickupPoint.details}
                                </p>
                            )}
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border">
                            <iframe
                                src={mapEmbedUrl(order.pickupPoint.address)}
                                title={`Emplacement de ${order.pickupPoint.name}`}
                                loading="lazy"
                                className="h-56 w-full"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 text-sm text-muted-foreground">
                        {order.shippingZone && (
                            <p>
                                Secteur : {order.shippingZone.name}
                                {order.shippingZone.estimatedDays
                                    ? ` · ${order.shippingZone.estimatedDays}`
                                    : ""}
                            </p>
                        )}
                        <p className="mt-1">
                            Nous vous contacterons à {order.customerEmail} pour
                            convenir de la livraison.
                        </p>
                    </div>
                )}
            </section>

            <div className="mt-8 flex justify-center">
                <Button asChild>
                    <Link href="/shop">Continuer mes achats</Link>
                </Button>
            </div>
        </div>
    );
}
