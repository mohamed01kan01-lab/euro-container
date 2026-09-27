"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { IconBuildingBank, IconCreditCard, IconLoader2, IconLock } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/public/button";
import { payByCard, switchToBankTransfer } from "@/app/[locale]/(public)/order/actions";

interface CardPaymentPanelProps {
    orderNumber: string;
    locale: string;
    amountLabel: string;
    /** Bouton principal (commande carte) ou simple alternative (commande virement). */
    primary: boolean;
    bankTransferAvailable?: boolean;
}

export function CardPaymentPanel({
    orderNumber,
    locale,
    amountLabel,
    primary,
    bankTransferAvailable,
}: CardPaymentPanelProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [redirecting, setRedirecting] = useState(false);
    const busy = pending || redirecting;

    function pay() {
        startTransition(async () => {
            const res = await payByCard(orderNumber, locale);
            if (!res.ok) {
                toast.error(res.error);
                router.refresh();
                return;
            }
            setRedirecting(true);
            window.location.assign(res.url);
        });
    }

    function switchToTransfer() {
        startTransition(async () => {
            const res = await switchToBankTransfer(orderNumber);
            if (res.ok) {
                toast.success("Coordonnées bancaires envoyées par email.");
                router.refresh();
            } else {
                toast.error(res.error);
            }
        });
    }

    if (!primary) {
        return (
            <button
                type="button"
                onClick={pay}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:border-foreground/30 disabled:opacity-60"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {busy ? <IconLoader2 size={18} className="animate-spin" /> : <IconCreditCard size={18} />}
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold">Payer par carte à la place</span>
                    <span className="block text-xs text-muted-foreground">
                        Commande confirmée immédiatement, sans attendre le virement.
                    </span>
                </span>
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <Button type="button" variant="accent" size="lg" className="w-full" disabled={busy} onClick={pay}>
                {busy ? <IconLoader2 className="animate-spin" /> : <IconLock />}
                {redirecting ? "Paiement sécurisé…" : `Payer ${amountLabel} par carte`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                Paiement sécurisé par Stripe. CB, Visa, Mastercard, Apple Pay, Google Pay.
            </p>
            {bankTransferAvailable && (
                <button
                    type="button"
                    onClick={switchToTransfer}
                    disabled={busy}
                    className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                    <IconBuildingBank size={15} /> Je préfère payer par virement
                </button>
            )}
        </div>
    );
}
