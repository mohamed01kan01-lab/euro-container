import type { PaymentStatus, ShippingStatus } from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const PAYMENT_STATUS: Record<
    PaymentStatus,
    { label: string; variant: BadgeVariant }
> = {
    PAID: { label: "Payé", variant: "default" },
    PENDING: { label: "En attente", variant: "secondary" },
    FAILED: { label: "Échoué", variant: "destructive" },
    REFUNDED: { label: "Remboursé", variant: "outline" },
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

/** Ordre de la timeline de livraison ; CANCELLED en est volontairement exclu. */
export const SHIPPING_FLOW: ShippingStatus[] = [
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
];

export const PAYMENT_VALUES = Object.keys(PAYMENT_STATUS) as PaymentStatus[];
export const SHIPPING_VALUES = Object.keys(SHIPPING_STATUS) as ShippingStatus[];
