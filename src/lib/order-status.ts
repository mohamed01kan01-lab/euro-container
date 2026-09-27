import type {
    PaymentStatus,
    RefundStatus,
    ShippingStatus,
} from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const PAYMENT_STATUS: Record<
    PaymentStatus,
    { label: string; variant: BadgeVariant }
> = {
    PENDING: { label: "En attente", variant: "secondary" },
    VERIFYING: { label: "À vérifier", variant: "outline" },
    PAID: { label: "Payé", variant: "default" },
    FAILED: { label: "Échoué", variant: "destructive" },
    REFUND_REQUESTED: { label: "Remboursement demandé", variant: "destructive" },
    REFUNDED: { label: "Remboursé", variant: "outline" },
    CANCELLED: { label: "Annulée", variant: "destructive" },
};

export const SHIPPING_STATUS: Record<
    ShippingStatus,
    { label: string; variant: BadgeVariant }
> = {
    PENDING: { label: "En attente", variant: "secondary" },
    PROCESSING: { label: "En préparation", variant: "outline" },
    SHIPPED: { label: "Expédiée", variant: "default" },
    DELIVERED: { label: "Livrée", variant: "default" },
    CANCELLED: { label: "Annulée", variant: "destructive" },
};

export const REFUND_STATUS: Record<
    RefundStatus,
    { label: string; variant: BadgeVariant }
> = {
    REQUESTED: { label: "À traiter", variant: "destructive" },
    REFUNDED: { label: "Remboursé", variant: "default" },
    REFUSED: { label: "Refusé", variant: "outline" },
};

/** Ordre de la timeline de livraison ; CANCELLED en est volontairement exclu. */
export const SHIPPING_FLOW: ShippingStatus[] = [
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
];

/** Statuts où aucun argent n'a encore été reçu ni annoncé. */
export const UNPAID_STATUSES: PaymentStatus[] = ["PENDING", "FAILED"];

/** Statuts qu'un paiement confirmé peut faire passer à PAID. */
export const PAYABLE_STATUSES: PaymentStatus[] = [
    "PENDING",
    "FAILED",
    "VERIFYING",
];

export const PAYMENT_VALUES = Object.keys(PAYMENT_STATUS) as PaymentStatus[];
export const SHIPPING_VALUES = Object.keys(SHIPPING_STATUS) as ShippingStatus[];
