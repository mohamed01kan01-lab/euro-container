import type { PaymentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS } from "@/lib/order-status";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    total: string;
    currency: string;
    paymentStatus: PaymentStatus;
    createdAt: Date;
}

interface RecentOrdersProps {
    orders: Order[];
    currency: string;
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function RecentOrders({ orders, currency }: RecentOrdersProps) {
    if (orders.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune commande pour le moment.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>#Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => {
                    const status = PAYMENT_STATUS[order.paymentStatus];
                    return (
                        <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                                #{order.orderNumber.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell className="font-medium">{order.customerName}</TableCell>
                            <TableCell>
                                {Number(order.total).toLocaleString("fr-FR", {
                                    style: "currency",
                                    currency: order.currency || currency,
                                    maximumFractionDigits: 0,
                                })}
                            </TableCell>
                            <TableCell>
                                <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                                {formatDate(order.createdAt)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
