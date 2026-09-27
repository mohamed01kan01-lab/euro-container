"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { IconHeadset, IconLoader2, IconMail, IconPhone } from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/public/button";
import { cn } from "@/lib/utils";
import { formatIban, isValidBic, isValidIban } from "@/lib/bank";
import { cancelMyOrder, requestRefund } from "@/app/[locale]/(public)/order/actions";

export type HelpMode = "cancel" | "refund-iban" | "refund-card";

const REASONS = [
    "Je me suis trompé de modèle",
    "Le délai ne me convient plus",
    "J'ai trouvé une autre solution",
    "Autre raison",
];

interface OrderHelpProps {
    orderNumber: string;
    mode: HelpMode;
    supportPhone: string | null;
    supportEmail: string | null;
}

/**
 * Lien discret « Annuler / demander un remboursement ». La fenêtre commence
 * toujours par proposer de parler à un conseiller : une commande sauvée vaut
 * mieux qu'une annulation.
 */
export function OrderHelp({ orderNumber, mode, supportPhone, supportEmail }: OrderHelpProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [reason, setReason] = useState("");
    const [iban, setIban] = useState("");
    const [bic, setBic] = useState("");

    const ibanError = iban.trim().length > 0 && !isValidIban(iban);
    const bicError = bic.trim().length > 0 && !isValidBic(bic);

    function onCancel() {
        startTransition(async () => {
            const res = await cancelMyOrder(orderNumber);
            if (res.ok) {
                toast.success("Votre commande est annulée.");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        });
    }

    function onRefund(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        startTransition(async () => {
            const res = await requestRefund(orderNumber, {
                reason,
                comment: String(form.get("comment") ?? ""),
                accountHolder: String(form.get("accountHolder") ?? ""),
                iban,
                bic,
            });
            if (res.ok) {
                toast.success("Demande envoyée. Nous revenons vers vous rapidement.");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        });
    }

    const support = (supportPhone || supportEmail) && (
        <div className="rounded-2xl bg-muted/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
                <IconHeadset size={16} /> Un doute ? Parlons-en d&apos;abord
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                Changement de modèle, date de livraison, accès au terrain : nous trouvons souvent une solution en quelques minutes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {supportPhone && (
                    <Button asChild size="sm" variant="outline">
                        <a href={`tel:${supportPhone}`}><IconPhone /> {supportPhone}</a>
                    </Button>
                )}
                {supportEmail && (
                    <Button asChild size="sm" variant="ghost">
                        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Commande ${orderNumber}`)}`}>
                            <IconMail /> Écrire
                        </a>
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
                {mode === "cancel" ? "Annuler ma commande" : "Demander un remboursement"}
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl">
                            {mode === "cancel" ? "Annuler votre commande ?" : "Demander un remboursement"}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === "cancel"
                                ? "Aucun paiement n'a été reçu : l'annulation est immédiate et gratuite."
                                : mode === "refund-card"
                                  ? "Le remboursement sera effectué sur la carte utilisée pour le paiement."
                                  : "Indiquez le compte sur lequel vous souhaitez être remboursé."}
                        </DialogDescription>
                    </DialogHeader>

                    {support}

                    {mode === "cancel" ? (
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                                {pending && <IconLoader2 className="animate-spin" />}
                                Annuler la commande
                            </Button>
                            <Button type="button" onClick={() => setOpen(false)}>
                                Garder ma commande
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={onRefund} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Motif</Label>
                                <div className="flex flex-wrap gap-2">
                                    {REASONS.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            aria-pressed={reason === r}
                                            onClick={() => setReason(r)}
                                            className={cn(
                                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                                reason === r
                                                    ? "border-orange-600 bg-orange-600 text-white"
                                                    : "border-border hover:border-foreground/40",
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="comment">Précisions <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
                                <Textarea id="comment" name="comment" rows={2} maxLength={1000} className="resize-none" />
                            </div>

                            {mode === "refund-iban" && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="accountHolder">Titulaire du compte</Label>
                                        <Input id="accountHolder" name="accountHolder" autoComplete="name" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="iban">IBAN</Label>
                                        <Input
                                            id="iban"
                                            value={iban}
                                            onChange={(e) => setIban(formatIban(e.target.value))}
                                            placeholder="FR76 3000 6000 0112 3456 7890 189"
                                            className="font-mono"
                                            autoComplete="off"
                                            aria-invalid={ibanError}
                                            required
                                        />
                                        {ibanError && <p className="text-xs text-destructive">IBAN incomplet ou invalide.</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="bic">BIC <span className="font-normal text-muted-foreground">(requis hors zone SEPA)</span></Label>
                                        <Input
                                            id="bic"
                                            value={bic}
                                            onChange={(e) => setBic(e.target.value.toUpperCase())}
                                            className="font-mono"
                                            autoComplete="off"
                                            aria-invalid={bicError}
                                        />
                                        {bicError && <p className="text-xs text-destructive">BIC invalide (8 ou 11 caractères).</p>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Votre IBAN est chiffré et n&apos;est utilisé que pour ce remboursement.
                                    </p>
                                </>
                            )}

                            <Button
                                type="submit"
                                variant="accent"
                                className="w-full"
                                disabled={pending || !reason || ibanError || bicError}
                            >
                                {pending && <IconLoader2 className="animate-spin" />}
                                Envoyer ma demande
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
