import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import { PAYMENT_STATUS, SHIPPING_STATUS } from "@/lib/order-status";
import type { OrderRow } from "@/app/(admin)/dashboard/orders/actions";

interface OrdersTableProps {
    orders: OrderRow[];
}

/** Table en lecture seule : les commandes naissent du checkout, pas du dashboard. */
export function OrdersTable({ orders }: OrdersTableProps) {
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
                    <TableHead>Livraison</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => {
                    const payment = PAYMENT_STATUS[order.paymentStatus];
                    const shipping = SHIPPING_STATUS[order.shippingStatus];
                    return (
                        <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                                <Link
                                    href={`/dashboard/orders/${order.id}`}
                                    className="hover:text-primary transition-colors"
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
                                {formatPrice(order.total, order.currency)}
                            </TableCell>
                            <TableCell>
                                <Badge variant={payment.variant}>
                                    {payment.label}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={shipping.variant}>
                                    {shipping.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Intl.DateTimeFormat("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(order.createdAt)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
