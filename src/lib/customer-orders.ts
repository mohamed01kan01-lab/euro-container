import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CustomerOrderRow } from "@/components/public/order/customer-orders-list";

/**
 * Commandes d'un client : celles rattachées à son compte ET celles passées en
 * invité avec le même email (vérifié à l'inscription). Aucun rattachement en
 * base n'est donc nécessaire quand un invité crée son compte.
 */
function customerWhere(user: { id: string; email: string }) {
    return {
        OR: [
            { userId: user.id },
            { customerEmail: { equals: user.email, mode: "insensitive" as const } },
        ],
    };
}

export async function getCustomerOrders(
    user: { id: string; email: string },
    take = 30,
): Promise<CustomerOrderRow[]> {
    const rows = await prisma.order.findMany({
        where: customerWhere(user),
        orderBy: { createdAt: "desc" },
        take,
        select: {
            orderNumber: true,
            createdAt: true,
            total: true,
            currency: true,
            paymentStatus: true,
            _count: { select: { items: true } },
        },
    });
    return rows.map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        total: Number(o.total),
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        itemCount: o._count.items,
    }));
}

const AWAITING_PAYMENT: PaymentStatus[] = ["PENDING", "FAILED"];

/** Badge du header : commandes qui attendent encore un paiement du client. */
export function countAwaitingPayment(user: { id: string; email: string }) {
    return prisma.order.count({
        where: { ...customerWhere(user), paymentStatus: { in: AWAITING_PAYMENT } },
    });
}
