"use client";

import { useState, useTransition } from "react";
import {
    IconCircleCheck,
    IconCopy,
    IconEye,
    IconFileText,
    IconLoader2,
    IconMailForward,
    IconReceiptRefund,
    IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_STATUS, REFUND_STATUS } from "@/lib/order-status";
import { paymentLabel } from "@/lib/payment";
import { formatPrice } from "@/lib/currency";
import {
    adminCancelOrder,
    confirmPayment,
    refundOrder,
    remindCustomer,
    resolveRefund,
    revealRefundIban,
    type AdminResult,
    type OrderDetail,
} from "@/app/(admin)/dashboard/orders/actions";
import { ProofPreviewButton } from "./proof-preview-button";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

type DialogState =
    | { kind: "confirm" }
    | { kind: "cancel" }
    | { kind: "refund" }
    | { kind: "resolve"; refundId: string; outcome: "REFUNDED" | "REFUSED" }
    | null;

export function PaymentPanel({ order }: { order: OrderDetail }) {
    const [pending, startTransition] = useTransition();
    const [dialog, setDialog] = useState<DialogState>(null);
    const [note, setNote] = useState("");
    const [notify, setNotify] = useState(true);
    const [restock, setRestock] = useState(false);
    const [viaStripe, setViaStripe] = useState(true);
    const [ibans, setIbans] = useState<Record<string, string>>({});

    const status = order.paymentStatus;
    const isCard = order.paymentMethod === "STRIPE";
    const canStripeRefund = isCard && !!order.paymentIntentId;
    const awaiting = status === "PENDING" || status === "FAILED" || status === "VERIFYING";
    const openRefund = order.refunds.find((r) => r.status === "REQUESTED");
    const amount = formatPrice(order.total, order.currency);

    function openDialog(d: DialogState) {
        setNote("");
        setNotify(true);
        setRestock(false);
        setViaStripe(true);
        setDialog(d);
    }

    function run(task: () => Promise<AdminResult>, success: string, close = true) {
        startTransition(async () => {
            try {
                const res = await task();
                if (res.ok) {
                    toast.success(success);
                    if (close) setDialog(null);
                } else {
                    toast.error(res.error);
                }
            } catch {
                toast.error("L'action a échoué.");
            }
        });
    }

    function reveal(id: string) {
        startTransition(async () => {
            const res = await revealRefundIban(id);
            if (res.ok) setIbans((prev) => ({ ...prev, [id]: res.iban }));
            else toast.error(res.error);
        });
    }

    function submitDialog() {
        if (!dialog) return;
        const opts = { note, restock, viaStripe: canStripeRefund && viaStripe };
        switch (dialog.kind) {
            case "confirm":
                return run(() => confirmPayment(order.id), "Paiement confirmé, le client est prévenu.");
            case "cancel":
                return run(() => adminCancelOrder(order.id, notify), "Commande annulée, stock remis.");
            case "refund":
                return run(() => refundOrder(order.id, opts), "Commande remboursée.");
            case "resolve":
                return run(
                    () => resolveRefund(dialog.refundId, dialog.outcome, opts),
                    dialog.outcome === "REFUNDED" ? "Remboursement enregistré." : "Demande refusée.",
                );
        }
    }

    const refundLike = dialog?.kind === "refund" || (dialog?.kind === "resolve" && dialog.outcome === "REFUNDED");

    return (
        <article className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Paiement</h2>
                <Badge variant={PAYMENT_STATUS[status].variant}>{PAYMENT_STATUS[status].label}</Badge>
            </header>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Moyen</dt>
                <dd>{paymentLabel(order.paymentMethod) ?? "—"}</dd>
                <dt className="text-muted-foreground">Montant</dt>
                <dd className="font-medium">{amount}</dd>
                {order.paymentDueAt && awaiting && (
                    <>
                        <dt className="text-muted-foreground">Réservée jusqu&apos;au</dt>
                        <dd className={order.paymentDueAt < new Date() ? "text-destructive font-medium" : ""}>
                            {dateFmt.format(order.paymentDueAt)}
                        </dd>
                    </>
                )}
                {order.paymentReminderCount > 0 && (
                    <>
                        <dt className="text-muted-foreground">Relances</dt>
                        <dd>
                            {order.paymentReminderCount}
                            {order.lastPaymentReminderAt && `, dernière le ${dateFmt.format(order.lastPaymentReminderAt)}`}
                        </dd>
                    </>
                )}
                {order.paidAt && (
                    <>
                        <dt className="text-muted-foreground">Payé le</dt>
                        <dd>{dateFmt.format(order.paidAt)}</dd>
                    </>
                )}
                {order.cancelledAt && (
                    <>
                        <dt className="text-muted-foreground">Annulée le</dt>
                        <dd>{dateFmt.format(order.cancelledAt)}</dd>
                    </>
                )}
                {order.paymentIntentId && (
                    <>
                        <dt className="text-muted-foreground">Stripe</dt>
                        <dd className="truncate font-mono text-xs">{order.paymentIntentId}</dd>
                    </>
                )}
            </dl>

            {status === "VERIFYING" && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    Le client a signalé son virement. Vérifiez sur votre compte qu&apos;un virement de {amount} avec la référence <span className="font-mono font-semibold">{order.orderNumber}</span> est arrivé.
                    {/* Commandes signalées avant que le justificatif devienne obligatoire. */}
                    {order.proofs.length === 0 && (
                        <span className="mt-1 block font-semibold">
                            Aucun justificatif joint : vérifiez directement sur votre relevé bancaire.
                        </span>
                    )}
                </p>
            )}

            {/* ─── Actions ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
                {awaiting && (
                    <Button size="sm" disabled={pending} onClick={() => openDialog({ kind: "confirm" })}>
                        <IconCircleCheck size={15} className="mr-1.5" /> Confirmer le paiement reçu
                    </Button>
                )}
                {(order.paymentMethod === "BANK_TRANSFER" || isCard) && (status === "PENDING" || status === "FAILED") && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                            run(
                                () => remindCustomer(order.id),
                                isCard ? "Lien de paiement renvoyé au client." : "Relance envoyée avec le RIB.",
                                false,
                            )
                        }
                    >
                        <IconMailForward size={15} className="mr-1.5" /> Relancer le client
                    </Button>
                )}
                {status === "PAID" && (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => openDialog({ kind: "refund" })}>
                        <IconReceiptRefund size={15} className="mr-1.5" /> Rembourser
                    </Button>
                )}
                {(awaiting || status === "REFUND_REQUESTED") && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => openDialog({ kind: "cancel" })}>
                        <IconX size={15} className="mr-1.5" /> Annuler la commande
                    </Button>
                )}
            </div>

            {/* ─── Justificatifs ───────────────────────────────────────── */}
            {order.proofs.length > 0 && (
                <>
                    <Separator />
                    <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Justificatifs ({order.proofs.length})
                        </h3>
                        <ul className="space-y-1.5">
                            {order.proofs.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <IconFileText size={16} className="shrink-0 text-muted-foreground" />
                                        <span className="min-w-0">
                                            <span className="block truncate">{p.originalName}</span>
                                            <span className="block text-xs text-muted-foreground">
                                                {dateFmt.format(p.createdAt)} · {Math.max(1, Math.round(p.bytes / 1024))} Ko
                                            </span>
                                        </span>
                                    </span>
                                    <ProofPreviewButton
                                        proofId={p.id}
                                        name={p.originalName}
                                        description={`Vérifiez le montant (${amount}) et la référence ${order.orderNumber}.`}
                                        actions={(close) =>
                                            awaiting && (
                                                <Button
                                                    className="rounded-full"
                                                    onClick={() => {
                                                        close();
                                                        openDialog({ kind: "confirm" });
                                                    }}
                                                >
                                                    <IconCircleCheck size={15} className="mr-1.5" /> Confirmer le paiement
                                                </Button>
                                            )
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            )}

            {/* ─── Remboursements ──────────────────────────────────────── */}
            {order.refunds.length > 0 && (
                <>
                    <Separator />
                    <section className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Demandes de remboursement
                        </h3>
                        {order.refunds.map((r) => (
                            <div key={r.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{r.reason}</span>
                                    <Badge variant={REFUND_STATUS[r.status].variant}>{REFUND_STATUS[r.status].label}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Demandée le {dateFmt.format(r.createdAt)}</p>
                                {r.comment && <p className="whitespace-pre-line text-muted-foreground">{r.comment}</p>}
                                {r.hasIban ? (
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted/50 p-2 text-xs">
                                        <dt className="text-muted-foreground">Titulaire</dt>
                                        <dd className="font-medium">{r.accountHolder}</dd>
                                        <dt className="text-muted-foreground">IBAN</dt>
                                        <dd className="flex flex-wrap items-center gap-2 font-mono">
                                            {ibans[r.id] ?? `•••• •••• ${r.ibanLast4}`}
                                            {ibans[r.id] ? (
                                                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Copier l'IBAN" onClick={() => navigator.clipboard.writeText(ibans[r.id].replace(/\s/g, "")).then(() => toast.success("IBAN copié"))}>
                                                    <IconCopy size={13} />
                                                </button>
                                            ) : (
                                                <button type="button" className="inline-flex items-center gap-1 font-sans text-muted-foreground hover:text-foreground" onClick={() => reveal(r.id)}>
                                                    <IconEye size={13} /> Révéler
                                                </button>
                                            )}
                                        </dd>
                                        {r.bic && (
                                            <>
                                                <dt className="text-muted-foreground">BIC</dt>
                                                <dd className="font-mono">{r.bic}</dd>
                                            </>
                                        )}
                                    </dl>
                                ) : (
                                    isCard && <p className="text-xs text-muted-foreground">Remboursement sur la carte utilisée.</p>
                                )}
                                {r.adminNote && <p className="text-xs italic text-muted-foreground">Note : {r.adminNote}</p>}
                                {r.status === "REQUESTED" && r.id === openRefund?.id && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button size="sm" disabled={pending} onClick={() => openDialog({ kind: "resolve", refundId: r.id, outcome: "REFUNDED" })}>
                                            Marquer remboursé
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={pending} onClick={() => openDialog({ kind: "resolve", refundId: r.id, outcome: "REFUSED" })}>
                                            Refuser
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>
                </>
            )}

            {/* ─── Confirmation ────────────────────────────────────────── */}
            <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.kind === "confirm" && "Confirmer la réception du paiement ?"}
                            {dialog?.kind === "cancel" && "Annuler cette commande ?"}
                            {dialog?.kind === "refund" && `Rembourser ${amount} ?`}
                            {dialog?.kind === "resolve" && (dialog.outcome === "REFUNDED" ? `Confirmer le remboursement de ${amount} ?` : "Refuser la demande ?")}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.kind === "confirm" && `La commande passe en « Payé » et le client reçoit un email de confirmation. Vérifiez d'abord que ${amount} est bien arrivé.`}
                            {dialog?.kind === "cancel" && "Le stock et l'usage du coupon sont remis. À réserver aux commandes dont aucun paiement n'a été reçu."}
                            {refundLike && (canStripeRefund ? "Le client est prévenu par email." : "Effectuez le virement de remboursement depuis votre banque, puis confirmez ici : le client est prévenu par email.")}
                            {dialog?.kind === "resolve" && dialog.outcome === "REFUSED" && "La commande retrouve son statut précédent et le client est prévenu par email."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {dialog?.kind === "cancel" && (
                            <div className="flex items-center gap-2">
                                <Checkbox id="notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
                                <Label htmlFor="notify" className="font-normal">Prévenir le client par email</Label>
                            </div>
                        )}
                        {refundLike && (
                            <>
                                {canStripeRefund && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="viaStripe" checked={viaStripe} onCheckedChange={(v) => setViaStripe(v === true)} />
                                        <Label htmlFor="viaStripe" className="font-normal">Rembourser automatiquement la carte via Stripe</Label>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Checkbox id="restock" checked={restock} onCheckedChange={(v) => setRestock(v === true)} />
                                    <Label htmlFor="restock" className="font-normal">Remettre les articles en stock</Label>
                                </div>
                            </>
                        )}
                        {(refundLike || dialog?.kind === "resolve") && (
                            <div className="space-y-1.5">
                                <Label htmlFor="note">Message au client <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
                                <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="resize-none" />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>Retour</Button>
                        <Button
                            onClick={submitDialog}
                            disabled={pending}
                            variant={dialog?.kind === "cancel" ? "destructive" : "default"}
                        >
                            {pending && <IconLoader2 size={14} className="mr-1.5 animate-spin" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </article>
    );
}
