"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatPrice } from "@/lib/currency";
import { PAYMENT_STATUS, SHIPPING_STATUS } from "@/lib/order-status";
import type { OrderRow } from "@/app/(admin)/dashboard/orders/actions";
import { ProofPreviewButton } from "./proof-preview-button";

interface OrdersTableProps {
    orders: OrderRow[];
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

/**
 * Table en lecture seule : les commandes naissent du checkout, pas du dashboard.
 * Toute la ligne ouvre la fiche ; le justificatif se consulte sur place.
 */
export function OrdersTable({ orders }: OrdersTableProps) {
    const router = useRouter();

    if (orders.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-12 text-center">
                Aucune commande ne correspond à ces critères.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Justificatif</TableHead>
                    <TableHead>Livraison</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => {
                    const payment = PAYMENT_STATUS[order.paymentStatus];
                    const shipping = SHIPPING_STATUS[order.shippingStatus];
                    const href = `/dashboard/orders/${order.id}`;
                    const amount = formatPrice(order.total, order.currency);
                    return (
                        <TableRow
                            key={order.id}
                            className="cursor-pointer"
                            onClick={() => router.push(href)}
                        >
                            <TableCell className="font-mono text-xs">
                                <Link
                                    href={href}
                                    className="hover:text-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {order.orderNumber.slice(0, 12)}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <p className="font-medium text-sm">
                                    {order.customerName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {order.customerEmail}
                                </p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm font-medium">
                                {amount}
                            </TableCell>
                            <TableCell>
                                <Badge variant={payment.variant}>
                                    {payment.label}
                                </Badge>
                            </TableCell>
                            {/* Les clics ici (bouton et fenêtre d'aperçu) n'ouvrent pas la fiche. */}
                            <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                                {order.latestProof ? (
                                    <ProofPreviewButton
                                        proofId={order.latestProof.id}
                                        name={order.latestProof.originalName}
                                        label={
                                            order.proofCount > 1
                                                ? `Voir la preuve (${order.proofCount})`
                                                : "Voir la preuve"
                                        }
                                        description={`Commande ${order.orderNumber} · ${order.customerName} · vérifiez le montant (${amount}) et la référence.`}
                                        actions={() => (
                                            <Button className="rounded-full" asChild>
                                                <Link href={href}>Ouvrir la commande</Link>
                                            </Button>
                                        )}
                                    />
                                ) : order.paymentStatus === "VERIFYING" ? (
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                        Aucun justificatif
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant={shipping.variant}>
                                    {shipping.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {dateFmt.format(order.createdAt)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
