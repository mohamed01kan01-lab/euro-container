import type { Metadata } from "next";
import type { PaymentStatus, ShippingStatus } from "@prisma/client";
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

    const orders = await getOrders({
        paymentStatus,
        shippingStatus,
        q: params.q?.trim() || undefined,
    });

    return (
        <section className="space-y-6">
            <PageHeader
                title="Commandes"
                description={`${orders.length} commande${orders.length !== 1 ? "s" : ""}`}
            />

            <OrdersFilters />

            <TableCard>
                <OrdersTable orders={orders} />
            </TableCard>
        </section>
    );
}
