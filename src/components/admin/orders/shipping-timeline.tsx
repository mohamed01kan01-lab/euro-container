import { IconCheck, IconX } from "@tabler/icons-react";
import type { ShippingStatus } from "@prisma/client";
import { SHIPPING_STATUS, SHIPPING_FLOW } from "@/lib/order-status";

interface ShippingTimelineProps {
    status: ShippingStatus;
}

export function ShippingTimeline({ status }: ShippingTimelineProps) {
    // Une commande annulée sort du parcours nominal : on l'affiche à part.
    if (status === "CANCELLED") {
        return (
            <p className="flex items-center gap-2 text-sm text-destructive">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
                    <IconX size={14} />
                </span>
                Commande annulée
            </p>
        );
    }

    const currentIndex = SHIPPING_FLOW.indexOf(status);

    return (
        <ol className="space-y-3">
            {SHIPPING_FLOW.map((step, index) => {
                const done = index <= currentIndex;
                return (
                    <li key={step} className="flex items-center gap-3">
                        <span
                            className={
                                done
                                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                    : "flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground"
                            }
                        >
                            {done ? (
                                <IconCheck size={13} />
                            ) : (
                                <span className="text-[10px]">{index + 1}</span>
                            )}
                        </span>
                        <span
                            className={
                                done
                                    ? "text-sm font-medium"
                                    : "text-sm text-muted-foreground"
                            }
                        >
                            {SHIPPING_STATUS[step].label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
