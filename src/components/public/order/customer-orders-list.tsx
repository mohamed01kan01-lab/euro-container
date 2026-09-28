import { IconChevronRight } from "@tabler/icons-react";
import type { PaymentStatus } from "@prisma/client";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Libellés côté client : orientés action, pas jargon interne. */
export const CUSTOMER_STATUS: Record<PaymentStatus, { label: string; tone: "action" | "wait" | "ok" | "off" }> = {
    PENDING: { label: "Paiement à effectuer", tone: "action" },
    FAILED: { label: "Paiement à effectuer", tone: "action" },
    VERIFYING: { label: "Paiement en vérification", tone: "wait" },
    PAID: { label: "Confirmée", tone: "ok" },
    REFUND_REQUESTED: { label: "Remboursement en cours", tone: "wait" },
    REFUNDED: { label: "Remboursée", tone: "off" },
    CANCELLED: { label: "Annulée", tone: "off" },
};

const TONE_CLASS = {
    action: "bg-orange-600 text-white",
    wait: "bg-primary/10 text-primary",
    ok: "bg-green-600/10 text-green-700 dark:text-green-400",
    off: "bg-muted text-muted-foreground",
};

export interface CustomerOrderRow {
    orderNumber: string;
    createdAt: Date;
    total: number;
    currency: string;
    paymentStatus: PaymentStatus;
    itemCount: number;
}

export function CustomerOrdersList({ orders }: { orders: CustomerOrderRow[] }) {
    const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
    return (
        <ul className="space-y-3">
            {orders.map((o) => {
                const status = CUSTOMER_STATUS[o.paymentStatus];
                return (
                    <li key={o.orderNumber}>
                        <Link
                            href={`/order/${o.orderNumber}`}
                            className="flex items-center gap-4 rounded-[22px] border border-border bg-card p-4 transition-colors hover:border-foreground/30 sm:p-5"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block font-mono text-sm font-semibold">{o.orderNumber}</span>
                                <span className="block text-xs text-muted-foreground">
                                    {dateFmt.format(o.createdAt)} · {o.itemCount} article{o.itemCount > 1 ? "s" : ""}
                                </span>
                            </span>
                            <span className="hidden font-semibold sm:block">{formatPrice(o.total, o.currency)}</span>
                            <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", TONE_CLASS[status.tone])}>
                                {status.label}
                            </span>
                            <IconChevronRight size={18} className="shrink-0 text-muted-foreground" />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
