import type { SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/email";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { formatPrice } from "@/lib/currency";
import { formatIban } from "@/lib/bank";
import { paymentLabel } from "@/lib/payment";
import { APP_URL, orderUrl } from "@/lib/stripe";

// ─── Données ─────────────────────────────────────────────────────────────────

async function load(orderId: string) {
    const [order, settings] = await Promise.all([
        prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        }),
        getSiteSettings(),
    ]);
    if (!order) throw new Error(`Commande ${orderId} introuvable`);
    return { order, settings };
}

type Loaded = Awaited<ReturnType<typeof load>>;

function adminRecipient(s: SiteSettings): string | null {
    return s.contactEmail || process.env.ADMIN_EMAIL || null;
}

// ─── Mise en page ────────────────────────────────────────────────────────────

const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const C = {
    ink: "#0F172A",
    muted: "#64748B",
    line: "#E2E8F0",
    soft: "#F8FAFC",
    accent: "#EA580C",
};

interface ShellOptions {
    settings: SiteSettings;
    preheader: string;
    title: string;
    intro: string;
    body?: string;
    ctas?: { label: string; url: string; secondary?: boolean }[];
}

function shell({ settings, preheader, title, intro, body = "", ctas = [] }: ShellOptions) {
    const buttons = ctas
        .map((c) =>
            c.secondary
                ? `<a href="${c.url}" style="display:inline-block;margin:0 8px 8px 0;border:2px solid ${C.line};color:${C.ink};text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:700;">${esc(c.label)}</a>`
                : `<a href="${c.url}" style="display:inline-block;margin:0 8px 8px 0;background:${C.accent};color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">${esc(c.label)}</a>`,
        )
        .join("");

    const contact = [settings.contactEmail, settings.phone].filter(Boolean).join(" · ");

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:24px;padding:36px 28px;">
        <tr><td style="padding-bottom:20px;border-bottom:1px solid ${C.line};">
          <p style="margin:0;font-size:20px;font-weight:700;color:${C.ink};">${esc(settings.siteName)}</p>
        </td></tr>
        <tr><td style="padding-top:26px;">
          <p style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};">${title}</p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${C.muted};">${intro}</p>
          ${body}
          ${buttons ? `<div style="margin-top:24px;">${buttons}</div>` : ""}
        </td></tr>
        <tr><td style="padding-top:28px;">
          <p style="margin:0;padding-top:18px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:#94A3B8;">
            Une question ? Répondez simplement à cet email${contact ? ` ou contactez-nous : ${esc(contact)}` : ""}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function kvTable(rows: [string, string][], highlightLast = false) {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border:1px solid ${C.line};border-radius:16px;padding:6px 16px;margin-bottom:18px;">
${rows
    .map(
        ([k, v], i) => `<tr>
  <td style="padding:9px 0;font-size:13px;color:${C.muted};vertical-align:top;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ""}">${esc(k)}</td>
  <td style="padding:9px 0 9px 12px;font-size:14px;color:${highlightLast && i === rows.length - 1 ? C.accent : C.ink};font-weight:700;text-align:right;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ""}">${v}</td>
</tr>`,
    )
    .join("")}
</table>`;
}

function summary({ order }: Loaded) {
    const cur = order.currency;
    const rows: [string, string][] = order.items.map((i) => [
        `${i.quantity} × ${i.name}`,
        formatPrice(Number(i.price) * i.quantity, cur),
    ]);
    if (Number(order.discount) > 0) {
        rows.push(["Remise", `−${formatPrice(Number(order.discount), cur)}`]);
    }
    rows.push([
        "Livraison",
        Number(order.shippingCost) === 0
            ? "Offerte"
            : formatPrice(Number(order.shippingCost), cur),
    ]);
    rows.push(["Total", formatPrice(Number(order.total), cur)]);
    return kvTable(rows, true);
}

function bankBlock({ order, settings: s }: Loaded) {
    const rows: [string, string][] = [
        ["Montant", formatPrice(Number(order.total), order.currency)],
        ["Référence à indiquer", `<span style="font-family:monospace;">${esc(order.orderNumber)}</span>`],
        ["Bénéficiaire", esc(s.bankAccountHolder ?? "")],
    ];
    if (s.bankHolderAddress) rows.push(["Adresse du bénéficiaire", esc(s.bankHolderAddress)]);
    rows.push(["IBAN", `<span style="font-family:monospace;">${esc(formatIban(s.bankIban ?? ""))}</span>`]);
    if (s.bankBic) rows.push(["BIC / SWIFT", `<span style="font-family:monospace;">${esc(s.bankBic)}</span>`]);
    if (s.bankName) rows.push(["Banque", esc(s.bankName)]);
    if (s.bankAddress) rows.push(["Adresse de la banque", esc(s.bankAddress)]);

    const extra = s.bankTransferDetails
        ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:${C.muted};white-space:pre-line;">${esc(s.bankTransferDetails)}</p>`
        : "";

    return `<p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.accent};">Coordonnées du virement</p>
${kvTable(rows)}${extra}`;
}

const dateFr = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);

// ─── Client ──────────────────────────────────────────────────────────────────

/** Commande par virement : tout ce qu'il faut pour payer, sans revenir sur le site. */
export async function sendOrderReceivedEmail(orderId: string) {
    const data = await load(orderId);
    const { order, settings } = data;
    const url = orderUrl(order.orderNumber);
    const amount = formatPrice(Number(order.total), order.currency);
    const due = order.paymentDueAt ? dateFr(order.paymentDueAt) : null;

    await send({
        to: order.customerEmail,
        subject: `Commande ${order.orderNumber} : dernière étape, votre virement de ${amount}`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: `Votre commande est réservée${due ? ` jusqu'au ${due}` : ""}. Voici les coordonnées du virement.`,
            title: `Merci ${esc(order.customerName.split(" ")[0])}, votre commande est réservée`,
            intro: `Il ne reste qu'une étape : effectuer un virement de <strong style="color:${C.ink};">${amount}</strong> en indiquant la référence <strong style="color:${C.ink};">${esc(order.orderNumber)}</strong>.${due ? ` Votre commande vous est réservée jusqu'au <strong style="color:${C.ink};">${due}</strong>.` : ""}`,
            body: bankBlock(data) + summary(data),
            ctas: [
                { label: "J'ai effectué le virement", url: `${url}#paiement` },
                { label: "Voir ma commande", url, secondary: true },
            ],
        }),
    });
}

export async function sendTransferDeclaredEmail(orderId: string) {
    const data = await load(orderId);
    const { order, settings } = data;
    await send({
        to: order.customerEmail,
        subject: `Commande ${order.orderNumber} : nous vérifions votre virement`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: "Vous recevrez une confirmation dès réception des fonds.",
            title: "Merci, nous vérifions votre virement",
            intro: "Nous avons bien noté votre virement. Dès que les fonds apparaissent sur notre compte, nous confirmons votre commande et lançons sa préparation. Vous recevrez un email à chaque étape.",
            body: summary(data),
            ctas: [{ label: "Suivre ma commande", url: orderUrl(order.orderNumber) }],
        }),
    });
}

export async function sendOrderPaidEmail(orderId: string) {
    const data = await load(orderId);
    const { order, settings } = data;
    await send({
        to: order.customerEmail,
        subject: `Paiement reçu : commande ${order.orderNumber} confirmée`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: "Votre commande est confirmée et passe en préparation.",
            title: "Paiement reçu, votre commande est confirmée",
            intro: `Nous avons bien reçu votre paiement${order.paymentMethod ? ` par ${esc(paymentLabel(order.paymentMethod)!.toLowerCase())}` : ""}. Votre commande passe en préparation, nous vous contactons pour organiser la ${order.shippingMethod === "PICKUP" ? "remise" : "livraison"}.`,
            body: summary(data),
            ctas: [{ label: "Suivre ma commande", url: orderUrl(order.orderNumber) }],
        }),
    });
}

export async function sendOrderCancelledEmail(orderId: string) {
    const data = await load(orderId);
    const { order, settings } = data;
    await send({
        to: order.customerEmail,
        subject: `Commande ${order.orderNumber} annulée`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: "Votre commande a été annulée.",
            title: "Votre commande a été annulée",
            intro: `La commande <strong style="color:${C.ink};">${esc(order.orderNumber)}</strong> est annulée. Si c'est une erreur ou si vous souhaitez un autre modèle, notre équipe vous aide volontiers à trouver le conteneur adapté.`,
            body: summary(data),
            ctas: [{ label: "Voir nos conteneurs", url: `${APP_URL}/shop` }],
        }),
    });
}

export async function sendRefundRequestedEmail(orderId: string) {
    const data = await load(orderId);
    const { order, settings } = data;
    await send({
        to: order.customerEmail,
        subject: `Commande ${order.orderNumber} : demande de remboursement reçue`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: "Nous traitons votre demande.",
            title: "Nous avons bien reçu votre demande",
            intro: "Notre équipe examine votre demande de remboursement et revient vers vous rapidement. Vous recevrez un email dès qu'elle est traitée.",
            body: summary(data),
            ctas: [{ label: "Voir ma commande", url: orderUrl(order.orderNumber) }],
        }),
    });
}

export async function sendRefundResolvedEmail(
    orderId: string,
    outcome: "REFUNDED" | "REFUSED",
    note: string | null,
) {
    const data = await load(orderId);
    const { order, settings } = data;
    const refunded = outcome === "REFUNDED";
    const noteHtml = note
        ? `<p style="margin:0 0 18px;padding:14px 16px;background:${C.soft};border-radius:14px;font-size:14px;line-height:1.6;color:${C.ink};white-space:pre-line;">${esc(note)}</p>`
        : "";
    await send({
        to: order.customerEmail,
        subject: refunded
            ? `Commande ${order.orderNumber} : remboursement effectué`
            : `Commande ${order.orderNumber} : réponse à votre demande`,
        replyTo: settings.contactEmail ?? undefined,
        html: shell({
            settings,
            preheader: refunded ? "Votre remboursement est en route." : "Réponse à votre demande de remboursement.",
            title: refunded ? "Votre remboursement est effectué" : "Votre demande de remboursement",
            intro: refunded
                ? `Nous avons remboursé <strong style="color:${C.ink};">${formatPrice(Number(order.total), order.currency)}</strong>. Selon votre banque, les fonds apparaissent sous 1 à 5 jours ouvrés.`
                : "Après examen, nous ne pouvons pas donner suite à votre demande de remboursement. Votre commande reste active.",
            body: noteHtml,
            ctas: [{ label: "Voir ma commande", url: orderUrl(order.orderNumber) }],
        }),
    });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

type AdminEvent = "NEW_ORDER" | "TRANSFER_DECLARED" | "PAID_BY_CARD" | "REFUND_REQUESTED" | "CANCELLED_BY_CUSTOMER";

const ADMIN_COPY: Record<AdminEvent, { subject: string; title: string; intro: string }> = {
    NEW_ORDER: {
        subject: "Nouvelle commande par virement",
        title: "Nouvelle commande en attente de virement",
        intro: "Le client a reçu les coordonnées bancaires. Le stock est réservé.",
    },
    TRANSFER_DECLARED: {
        subject: "Virement signalé, à vérifier",
        title: "Un client a signalé son virement",
        intro: "Vérifiez la réception des fonds puis confirmez le paiement depuis la fiche commande.",
    },
    PAID_BY_CARD: {
        subject: "Commande payée par carte",
        title: "Nouvelle commande payée par carte",
        intro: "Le paiement Stripe est confirmé. La commande peut passer en préparation.",
    },
    REFUND_REQUESTED: {
        subject: "Demande de remboursement",
        title: "Nouvelle demande de remboursement",
        intro: "Le client a demandé un remboursement. Traitez-la depuis la fiche commande.",
    },
    CANCELLED_BY_CUSTOMER: {
        subject: "Commande annulée par le client",
        title: "Un client a annulé sa commande",
        intro: "Aucun paiement n'avait été reçu. Le stock a été remis en vente.",
    },
};

export async function notifyAdmin(orderId: string, event: AdminEvent) {
    const data = await load(orderId);
    const { order, settings } = data;
    const to = adminRecipient(settings);
    if (!to) return;
    const copy = ADMIN_COPY[event];
    const amount = formatPrice(Number(order.total), order.currency);
    await send({
        to,
        subject: `[${settings.siteName}] ${copy.subject} : ${order.orderNumber} (${amount})`,
        replyTo: order.customerEmail,
        html: shell({
            settings,
            preheader: `${order.customerName} · ${amount}`,
            title: copy.title,
            intro: copy.intro,
            body:
                kvTable([
                    ["Commande", `<span style="font-family:monospace;">${esc(order.orderNumber)}</span>`],
                    ["Client", esc(order.customerName)],
                    ["Email", esc(order.customerEmail)],
                    ...(order.customerPhone ? [["Téléphone", esc(order.customerPhone)] as [string, string]] : []),
                    ["Paiement", esc(paymentLabel(order.paymentMethod) ?? "—")],
                ]) + summary(data),
            ctas: [{ label: "Ouvrir la commande", url: `${APP_URL}/dashboard/orders/${order.id}` }],
        }),
    });
}
