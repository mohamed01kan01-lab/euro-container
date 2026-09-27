import type { Metadata } from "next";
import Link from "next/link";
import type { PaymentStatus, ShippingStatus } from "@prisma/client";
import { IconBuildingBank, IconReceiptRefund } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getOrders } from "./actions";
import { PAYMENT_VALUES, SHIPPING_VALUES } from "@/lib/order-status";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { OrdersFilters } from "@/components/admin/orders/orders-filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Commandes" };

interface PageProps {
    searchParams: Promise<{
        payment?: string;
        shipping?: string;
        q?: string;
    }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const paymentStatus = PAYMENT_VALUES.includes(params.payment as PaymentStatus)
        ? (params.payment as PaymentStatus)
        : undefined;
    const shippingStatus = SHIPPING_VALUES.includes(
        params.shipping as ShippingStatus,
    )
        ? (params.shipping as ShippingStatus)
        : undefined;

    const [orders, toVerify, toRefund] = await Promise.all([
        getOrders({
            paymentStatus,
            shippingStatus,
            q: params.q?.trim() || undefined,
        }),
        prisma.order.count({ where: { paymentStatus: "VERIFYING" } }),
        prisma.order.count({ where: { paymentStatus: "REFUND_REQUESTED" } }),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Commandes"
                description={`${orders.length} commande${orders.length !== 1 ? "s" : ""}`}
            />

            {(toVerify > 0 || toRefund > 0) && (
                <div className="flex flex-wrap gap-2">
                    {toVerify > 0 && (
                        <Link
                            href="/dashboard/orders?payment=VERIFYING"
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400"
                        >
                            <IconBuildingBank size={16} />
                            {toVerify} virement{toVerify > 1 ? "s" : ""} à vérifier
                        </Link>
                    )}
                    {toRefund > 0 && (
                        <Link
                            href="/dashboard/orders?payment=REFUND_REQUESTED"
                            className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                        >
                            <IconReceiptRefund size={16} />
                            {toRefund} remboursement{toRefund > 1 ? "s" : ""} à traiter
                        </Link>
                    )}
                </div>
            )}

            <OrdersFilters />

            <TableCard>
                <OrdersTable orders={orders} />
            </TableCard>
        </section>
    );
}
