import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconMail, IconPhone, IconMapPin } from "@tabler/icons-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/currency";
import { PAYMENT_STATUS } from "@/lib/order-status";
import { getOrder } from "../actions";
import { OrderActions } from "@/components/admin/orders/order-actions";
import { ShippingTimeline } from "@/components/admin/orders/shipping-timeline";

export const metadata: Metadata = { title: "Commande" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) notFound();

    const { currency } = order;
    const address = order.shippingAddress;
    // Le Json d'adresse peut être partiel : on n'affiche que ce qui existe.
    const addressLines = [
        address.line1,
        address.line2,
        [address.postalCode, address.city].filter(Boolean).join(" "),
        address.country,
    ].filter((line): line is string => !!line && line.trim().length > 0);

    const payment = PAYMENT_STATUS[order.paymentStatus];

    return (
        <section className="space-y-6">
            <header className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link
                            href="/dashboard/orders"
                            aria-label="Retour aux commandes"
                        >
                            <IconArrowLeft size={16} />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold font-mono">
                            {order.orderNumber}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "long",
                                timeStyle: "short",
                            }).format(order.createdAt)}
                        </p>
                    </div>
                </div>
                <Badge variant={payment.variant}>{payment.label}</Badge>
            </header>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-6">
                    {/* Client */}
                    <article className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <h2 className="text-sm font-semibold">Client</h2>
                        <p className="font-medium">{order.customerName}</p>
                        <dl className="space-y-1.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <IconMail size={14} className="shrink-0" />
                                <dd>{order.customerEmail}</dd>
                            </div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2">
                                    <IconPhone size={14} className="shrink-0" />
                                    <dd>{order.customerPhone}</dd>
                                </div>
                            )}
                            {addressLines.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <IconMapPin
                                        size={14}
                                        className="shrink-0 mt-0.5"
                                    />
                                    <dd>
                                        {addressLines.map((line) => (
                                            <span key={line} className="block">
                                                {line}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {addressLines.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Aucune adresse de livraison enregistrée.
                            </p>
                        )}
                    </article>

                    {/* Produits */}
                    <article className="rounded-xl border border-border bg-card overflow-hidden">
                        <h2 className="text-sm font-semibold p-4 pb-0">
                            Produits
                        </h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead className="w-20">Qté</TableHead>
                                    <TableHead className="w-32">
                                        Prix unitaire
                                    </TableHead>
                                    <TableHead className="w-32">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.name}
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatPrice(item.price, currency)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {formatPrice(
                                                item.price * item.quantity,
                                                currency,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="p-4 space-y-1.5 text-sm">
                            <Separator className="mb-3" />
                            <div className="flex justify-between text-muted-foreground">
                                <span>Sous-total</span>
                                <span>
                                    {formatPrice(order.subtotal, currency)}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Livraison</span>
                                <span>
                                    {formatPrice(order.shippingCost, currency)}
                                </span>
                            </div>
                            {order.discount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>
                                        Remise
                                        {order.couponCode
                                            ? ` (${order.couponCode})`
                                            : ""}
                                    </span>
                                    <span>
                                        −{formatPrice(order.discount, currency)}
                                    </span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-semibold text-base">
                                <span>Total</span>
                                <span>{formatPrice(order.total, currency)}</span>
                            </div>
                            {order.paymentMethod && (
                                <p className="text-xs text-muted-foreground pt-1">
                                    Payé via {order.paymentMethod}
                                </p>
                            )}
                        </div>
                    </article>

                    {/* Timeline */}
                    <article className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <h2 className="text-sm font-semibold">
                            Suivi de livraison
                        </h2>
                        <ShippingTimeline status={order.shippingStatus} />
                        {order.trackingNumber && (
                            <p className="text-xs text-muted-foreground pt-1">
                                Numéro de suivi :{" "}
                                <span className="font-mono">
                                    {order.trackingNumber}
                                </span>
                            </p>
                        )}
                    </article>
                </div>

                <div className="lg:sticky lg:top-4">
                    <OrderActions order={order} />
                </div>
            </div>
        </section>
    );
}
