import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import QRCode from "qrcode";
import {
    IconBuildingBank,
    IconBuildingStore,
    IconCheck,
    IconCircleCheck,
    IconClockHour4,
    IconCreditCard,
    IconHourglass,
    IconReceiptRefund,
    IconTruck,
    IconUserPlus,
    IconX,
} from "@tabler/icons-react";
import type { PaymentStatus, ShippingStatus } from "@prisma/client";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { formatPrice } from "@/lib/currency";
import { MapEmbed } from "@/components/public/map-embed";
import { epcQrPayload } from "@/lib/bank";
import {
    isBankTransferConfigured,
    isStripeConfigured,
    paymentLabel,
} from "@/lib/payment";
import { syncStripeSession } from "@/lib/order-payment";
import { cn } from "@/lib/utils";
import { Button } from "@/components/public/button";
import { Separator } from "@/components/ui/separator";
import { BankTransferPanel } from "@/components/public/order/bank-transfer-panel";
import { CardPaymentPanel } from "@/components/public/order/card-payment-panel";
import { OrderHelp, type HelpMode } from "@/components/public/order/order-help";

export const metadata: Metadata = {
    title: "Votre commande",
    robots: { index: false, follow: false },
};

interface PageProps {
    params: Promise<{ locale: string; orderNumber: string }>;
    searchParams: Promise<{ session_id?: string; payment?: string }>;
}

// ─── Suivi ───────────────────────────────────────────────────────────────────

function progressIndex(payment: PaymentStatus, shipping: ShippingStatus): number {
    if (payment !== "PAID") return 1; // étape Paiement en cours
    if (shipping === "DELIVERED") return 4;
    if (shipping === "SHIPPED") return 3;
    return 2;
}

function Progress({ current }: { current: number }) {
    const steps = ["Commande", "Paiement", "Préparation", "Livraison"];
    return (
        <ol className="grid grid-cols-4 gap-2">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <li key={label} className="flex flex-col gap-2">
                        <span className={cn("h-1.5 rounded-full", done ? "bg-green-600" : active ? "bg-orange-600" : "bg-muted")} />
                        <span className={cn("flex items-center gap-1 text-[11px] font-semibold sm:text-xs", done || active ? "text-foreground" : "text-muted-foreground")}>
                            {done && <IconCheck size={12} className="text-green-600" />}
                            {label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function OrderPage({ params, searchParams }: PageProps) {
    const [{ orderNumber, locale }, sp] = await Promise.all([params, searchParams]);

    // Retour de Stripe : on confirme le paiement tout de suite, sans attendre le
    // webhook, pour que le client voie immédiatement « Paiement reçu ».
    if (sp.session_id) {
        try {
            await syncStripeSession(sp.session_id);
        } catch (err) {
            console.error("[order] synchro Stripe :", err);
        }
    }

    const [order, settings] = await Promise.all([
        prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: true,
                pickupPoint: true,
                shippingZone: { select: { name: true, estimatedDays: true } },
                _count: { select: { paymentProofs: true } },
            },
        }),
        getSiteSettings(),
    ]);
    if (!order) notFound();

    const [session, existingUser] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        prisma.user.findUnique({ where: { email: order.customerEmail }, select: { id: true } }),
    ]);
    const hasAccount = !!existingUser;
    const hasTax = Number(order.taxAmount) > 0;

    const { currency, paymentStatus: status } = order;
    const total = Number(order.total);
    const amountLabel = formatPrice(total, currency);
    const method = order.paymentMethod;
    const unpaid = status === "PENDING" || status === "FAILED";
    const stripeOn = isStripeConfigured(settings);
    const bankOn = isBankTransferConfigured(settings);
    const firstName = order.customerName.split(" ")[0];
    const dueLabel = order.paymentDueAt
        ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(order.paymentDueAt)
        : null;

    // ─── Virement : coordonnées et QR code SEPA ──────────────────────────────
    const showBank =
        bankOn && method === "BANK_TRANSFER" && (unpaid || status === "VERIFYING");
    const bank = showBank
        ? {
              accountHolder: settings.bankAccountHolder!,
              holderAddress: settings.bankHolderAddress,
              iban: settings.bankIban!,
              bic: settings.bankBic,
              bankName: settings.bankName,
              bankAddress: settings.bankAddress,
              instructions: settings.bankTransferDetails,
          }
        : null;
    let qrSvg: string | null = null;
    if (bank && unpaid) {
        const payload = epcQrPayload({ bank, amount: total, currency, reference: order.orderNumber });
        if (payload) {
            qrSvg = await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
        }
    }

    // ─── En-tête selon l'état ────────────────────────────────────────────────
    let hero: { icon: React.ReactNode; tone: "ok" | "wait" | "action" | "off"; title: string; text: string };
    if (status === "CANCELLED") {
        hero = { icon: <IconX size={26} />, tone: "off", title: "Commande annulée", text: "Aucun montant ne vous sera demandé. Besoin d'un autre modèle ? Nous sommes là pour vous conseiller." };
    } else if (status === "REFUNDED") {
        hero = { icon: <IconReceiptRefund size={26} />, tone: "off", title: "Commande remboursée", text: "Le remboursement a été effectué. Selon votre banque, les fonds apparaissent sous 1 à 5 jours ouvrés." };
    } else if (status === "REFUND_REQUESTED") {
        hero = { icon: <IconHourglass size={26} />, tone: "wait", title: "Demande de remboursement en cours", text: "Notre équipe traite votre demande et vous répond par email rapidement." };
    } else if (status === "PAID") {
        hero = { icon: <IconCircleCheck size={26} />, tone: "ok", title: sp.session_id ? `Merci ${firstName}, paiement reçu !` : "Paiement reçu, commande confirmée", text: `Votre commande est confirmée. Nous la préparons et vous contactons au ${order.customerPhone ?? order.customerEmail} pour organiser la ${order.shippingMethod === "PICKUP" ? "remise" : "livraison"}.` };
    } else if (status === "VERIFYING") {
        hero = { icon: <IconClockHour4 size={26} />, tone: "wait", title: "Merci, nous vérifions votre virement", text: "Vous recevez une confirmation par email dès réception des fonds, généralement sous 1 à 2 jours ouvrés. Votre commande reste réservée." };
    } else if (bank) {
        hero = { icon: <IconBuildingBank size={26} />, tone: "action", title: `Dernière étape : votre virement de ${amountLabel}`, text: `Merci ${firstName} ! Votre commande est réservée${dueLabel ? ` jusqu'au ${dueLabel}` : ""}. Indiquez bien la référence ${order.orderNumber} dans votre virement.` };
    } else if (method === "STRIPE" && stripeOn) {
        hero = sp.payment === "cancelled"
            ? { icon: <IconCreditCard size={26} />, tone: "action", title: "Paiement non finalisé", text: "Rien n'a été débité et votre commande est toujours réservée. Vous pouvez reprendre le paiement en un clic." }
            : { icon: <IconCreditCard size={26} />, tone: "action", title: "Finalisez votre paiement", text: sp.session_id ? "Votre paiement est en cours de confirmation par votre banque. Actualisez la page dans un instant." : "Votre commande est réservée. Réglez-la par carte pour la confirmer immédiatement." };
    } else {
        hero = { icon: <IconCircleCheck size={26} />, tone: "wait", title: "Commande enregistrée", text: `Nous vous contactons à ${order.customerEmail} pour finaliser le règlement.` };
    }

    const helpMode: HelpMode | null = unpaid
        ? "cancel"
        : status === "VERIFYING" || status === "PAID"
          ? method === "STRIPE"
              ? "refund-card"
              : "refund-iban"
          : null;
    const showProgress = unpaid || status === "VERIFYING" || status === "PAID";

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
            {/* ─── En-tête ───────────────────────────────────────────────── */}
            <header className="flex flex-col gap-4">
                <span
                    className={cn(
                        "flex size-14 items-center justify-center rounded-full",
                        hero.tone === "ok" && "bg-green-600/10 text-green-600",
                        hero.tone === "wait" && "bg-primary/10 text-primary",
                        hero.tone === "action" && "bg-orange-600/10 text-orange-600",
                        hero.tone === "off" && "bg-muted text-muted-foreground",
                    )}
                >
                    {hero.icon}
                </span>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Commande <span className="font-mono text-foreground">{order.orderNumber}</span>
                    </p>
                    <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{hero.title}</h1>
                    <p className="mt-3 text-sm text-muted-foreground sm:text-base">{hero.text}</p>
                </div>
                {showProgress && (
                    <div className="mt-2">
                        <Progress current={progressIndex(status, order.shippingStatus)} />
                    </div>
                )}
            </header>

            {/* ─── Action de paiement ─────────────────────────────────────── */}
            {bank && (
                <section className="mt-8 rounded-[30px] border border-orange-600/30 bg-card p-4 sm:p-6">
                    <BankTransferPanel
                        orderNumber={order.orderNumber}
                        amount={total}
                        amountLabel={amountLabel}
                        bank={bank}
                        qrSvg={qrSvg}
                        declared={status === "VERIFYING"}
                    />
                    {unpaid && stripeOn && (
                        <div className="mt-4">
                            <CardPaymentPanel orderNumber={order.orderNumber} locale={locale} amountLabel={amountLabel} primary={false} />
                        </div>
                    )}
                </section>
            )}

            {!bank && unpaid && method === "STRIPE" && stripeOn && (
                <section className="mt-8 rounded-[30px] border border-orange-600/30 bg-card p-5 sm:p-6">
                    <CardPaymentPanel orderNumber={order.orderNumber} locale={locale} amountLabel={amountLabel} primary bankTransferAvailable={bankOn} />
                </section>
            )}

            {/* ─── Récapitulatif ─────────────────────────────────────────── */}
            <section className="mt-6 rounded-[26px] border border-border bg-card p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Récapitulatif</p>
                <ul className="mt-4 space-y-3">
                    {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3 text-sm">
                            <span className="min-w-0">
                                <span className="block">{item.name}</span>
                                <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                            </span>
                            <span className="whitespace-nowrap">{formatPrice(Number(item.price) * item.quantity, currency)}</span>
                        </li>
                    ))}
                </ul>
                <Separator className="my-4" />
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <dt>Sous-total{hasTax ? " HT" : ""}</dt>
                        <dd>{formatPrice(Number(order.subtotal), currency)}</dd>
                    </div>
                    {Number(order.discount) > 0 && (
                        <div className="flex justify-between text-green-600">
                            <dt>Remise</dt>
                            <dd>−{formatPrice(Number(order.discount), currency)}</dd>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <dt>Livraison</dt>
                        <dd>{Number(order.shippingCost) === 0 ? "Offerte" : formatPrice(Number(order.shippingCost), currency)}</dd>
                    </div>
                    {hasTax && (
                        <div className="flex justify-between text-muted-foreground">
                            <dt>TVA ({Number(order.taxRate)} %)</dt>
                            <dd>{formatPrice(Number(order.taxAmount), currency)}</dd>
                        </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-baseline justify-between">
                        <dt className="font-semibold">Total{hasTax ? " TTC" : ""}</dt>
                        <dd className="font-display text-2xl text-orange-600">{amountLabel}</dd>
                    </div>
                </dl>
                {method && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Moyen de paiement : {paymentLabel(method)}
                        {order._count.paymentProofs > 0 && ` · ${order._count.paymentProofs} justificatif${order._count.paymentProofs > 1 ? "s" : ""} reçu${order._count.paymentProofs > 1 ? "s" : ""}`}
                    </p>
                )}
            </section>

            {/* ─── Livraison ─────────────────────────────────────────────── */}
            <section className="mt-6 rounded-[26px] border border-border bg-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {order.shippingMethod === "PICKUP" ? (
                        <><IconBuildingStore size={16} /> Retrait sur dépôt</>
                    ) : (
                        <><IconTruck size={16} /> Livraison</>
                    )}
                </h2>
                {order.shippingMethod === "PICKUP" && order.pickupPoint ? (
                    <div className="mt-3 space-y-3">
                        <div className="text-sm">
                            <p className="font-medium">{order.pickupPoint.name}</p>
                            <p className="text-muted-foreground">{order.pickupPoint.address}</p>
                            {order.pickupPoint.hours && <p className="text-muted-foreground">{order.pickupPoint.hours}</p>}
                        </div>
                        <div className="overflow-hidden rounded-[20px] border border-border">
                            <MapEmbed
                                address={order.pickupPoint.address}
                                title={`Emplacement de ${order.pickupPoint.name}`}
                                className="h-52"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 text-sm text-muted-foreground">
                        {order.shippingZone && (
                            <p>
                                Secteur : {order.shippingZone.name}
                                {order.shippingZone.estimatedDays ? ` · ${order.shippingZone.estimatedDays}` : ""}
                            </p>
                        )}
                        <p className="mt-1">
                            Nous vous appelons pour convenir du créneau et vérifier l&apos;accès au terrain avant la livraison.
                        </p>
                    </div>
                )}
            </section>

            {/* ─── Compte : invité → client suivi ────────────────────────── */}
            {!session && status !== "CANCELLED" && (
                <section className="mt-6 flex flex-col gap-4 rounded-[26px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-600/10 text-orange-600">
                            <IconUserPlus size={20} />
                        </span>
                        <div>
                            <p className="font-semibold">
                                {hasAccount ? "Retrouvez toutes vos commandes" : "Suivez vos commandes en un coup d'œil"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {hasAccount
                                    ? `Un compte existe déjà pour ${order.customerEmail}.`
                                    : "Créez votre compte : cette commande y sera rattachée et vos coordonnées pré-remplies la prochaine fois."}
                            </p>
                        </div>
                    </div>
                    <Button asChild variant={hasAccount ? "outline" : "default"} className="shrink-0">
                        <NextLink
                            href={
                                hasAccount
                                    ? `/login?callbackUrl=${encodeURIComponent("/account")}`
                                    : `/signup?email=${encodeURIComponent(order.customerEmail)}&name=${encodeURIComponent(order.customerName)}`
                            }
                        >
                            {hasAccount ? "Se connecter" : "Créer mon compte"}
                        </NextLink>
                    </Button>
                </section>
            )}

            {/* ─── Pied ──────────────────────────────────────────────────── */}
            <footer className="mt-8 flex flex-col items-center gap-4">
                <Button asChild variant="outline">
                    <Link href="/shop">Continuer mes achats</Link>
                </Button>
                {helpMode && (
                    <OrderHelp
                        orderNumber={order.orderNumber}
                        mode={helpMode}
                        supportPhone={settings.phone}
                        supportEmail={settings.contactEmail}
                    />
                )}
            </footer>
        </div>
    );
}
