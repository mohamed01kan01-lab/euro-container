import { Resend } from "resend";
import type { Role, SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "Euro Container Market <noreply@eurocontainermarket.com>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// ─── Envoi ───────────────────────────────────────────────────────────────────

/**
 * Le SDK Resend ne rejette jamais : il résout vers { data, error }. Sans cette
 * inspection, un envoi refusé (domaine non vérifié, clé absente, destinataire
 * interdit en mode test) passerait pour un succès.
 */
export async function send(payload: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}) {
    const { error } = await resend.emails.send({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        replyTo: payload.replyTo,
    });

    if (error) {
        const detail = [error.name, error.message].filter(Boolean).join(" — ");
        console.error("[email] Envoi refusé par Resend :", error);
        throw new Error(`Envoi de l'email impossible : ${detail}`);
    }
}

// ─── Mise en page commune ────────────────────────────────────────────────────
// Partagée par les emails de compte (ici) et de commande (order-emails.ts).

export const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const EMAIL_COLORS = {
    ink: "#0F172A",
    muted: "#64748B",
    line: "#E2E8F0",
    soft: "#F8FAFC",
    accent: "#EA580C",
};
const C = EMAIL_COLORS;

export interface EmailBrand {
    siteName: string;
    contactEmail: string | null;
    phone: string | null;
    /** Raison sociale, forme, SIRET… : pied de page des emails. */
    legalLine: string | null;
}

export function brandFromSettings(s: SiteSettings): EmailBrand {
    const legal = [
        s.legalName && [s.legalName, s.legalForm].filter(Boolean).join(" "),
        s.legalCapital && `capital ${s.legalCapital}`,
        s.legalSiret && `SIRET ${s.legalSiret}`,
        s.legalVatNumber && `TVA ${s.legalVatNumber}`,
    ].filter(Boolean);
    return {
        siteName: s.siteName,
        contactEmail: s.contactEmail,
        phone: s.phone,
        legalLine: legal.length ? legal.join(" · ") : null,
    };
}

/**
 * Lecture directe en base plutôt que getSiteSettings() : ce module est importé
 * par lib/auth, et les actions de réglages importent lib/auth (import circulaire).
 */
async function loadBrand(): Promise<EmailBrand> {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    return s
        ? brandFromSettings(s)
        : { siteName: "Euro Container Market", contactEmail: null, phone: null, legalLine: null };
}

export interface RenderEmailOptions {
    brand: EmailBrand;
    preheader: string;
    /** HTML autorisé : les valeurs dynamiques doivent être passées par esc(). */
    title: string;
    intro: string;
    body?: string;
    ctas?: { label: string; url: string; secondary?: boolean }[];
}

export function renderEmail({ brand, preheader, title, intro, body = "", ctas = [] }: RenderEmailOptions) {
    const buttons = ctas
        .map((c) =>
            c.secondary
                ? `<a href="${c.url}" style="display:inline-block;margin:0 8px 8px 0;border:2px solid ${C.line};color:${C.ink};text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:700;">${esc(c.label)}</a>`
                : `<a href="${c.url}" style="display:inline-block;margin:0 8px 8px 0;background:${C.accent};color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">${esc(c.label)}</a>`,
        )
        .join("");

    const contact = [brand.contactEmail, brand.phone].filter(Boolean).join(" · ");

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:24px;padding:36px 28px;">
        <tr><td style="padding-bottom:20px;border-bottom:1px solid ${C.line};">
          <p style="margin:0;font-size:20px;font-weight:700;color:${C.ink};">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${C.accent};margin-right:8px;"></span>${esc(brand.siteName)}
          </p>
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
            ${brand.legalLine ? `<br>${esc(brand.legalLine)}` : ""}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function kvTable(rows: [string, string][], highlightLast = false) {
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

// ─── Emails de compte ────────────────────────────────────────────────────────

export async function sendVerificationOtpEmail({
    email,
    otp,
    type,
}: {
    email: string;
    otp: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}) {
    const subjects: Record<string, string> = {
        "email-verification": "Vérifiez votre adresse email",
        "forget-password": "Réinitialisation de votre mot de passe",
        "sign-in": "Votre code de connexion",
        "change-email": "Confirmez votre nouvel email",
    };
    const messages: Record<string, string> = {
        "email-verification": "Saisissez ce code pour vérifier votre adresse email.",
        "forget-password": "Saisissez ce code pour réinitialiser votre mot de passe.",
        "sign-in": "Saisissez ce code pour vous connecter.",
        "change-email": "Saisissez ce code pour confirmer votre nouvel email.",
    };
    const brand = await loadBrand();
    await send({
        to: email,
        subject: `${subjects[type] ?? "Votre code de vérification"} : ${otp}`,
        html: renderEmail({
            brand,
            preheader: `Votre code : ${otp}`,
            title: "Votre code de vérification",
            intro: messages[type] ?? "Saisissez ce code pour continuer.",
            body: `<div style="background:${C.soft};border:2px solid ${C.line};border-radius:18px;padding:22px;text-align:center;margin-bottom:18px;">
  <span style="font-size:38px;font-weight:700;letter-spacing:12px;color:${C.accent};font-family:monospace;">${esc(otp)}</span>
</div>
<p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">Ce code expire dans <strong>5 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
        }),
    });
}

export async function sendWelcomeEmail({ email, name }: { email: string; name: string }) {
    const brand = await loadBrand();
    await send({
        to: email,
        subject: `Bienvenue chez ${brand.siteName}`,
        html: renderEmail({
            brand,
            preheader: "Votre compte est prêt.",
            title: `Bienvenue, ${esc(name.split(" ")[0])}`,
            intro: "Votre compte est prêt. Retrouvez-y vos commandes, finalisez un paiement ou envoyez un justificatif de virement en quelques clics. Au prochain achat, vos coordonnées seront déjà remplies.",
            ctas: [
                { label: "Accéder à mon compte", url: `${APP_URL}/account` },
                { label: "Voir les conteneurs", url: `${APP_URL}/shop`, secondary: true },
            ],
        }),
    });
}

/**
 * Envoyé quand un administrateur crée un compte pour quelqu'un d'autre.
 * Contient les identifiants et le lien de connexion : sans cela, la personne
 * n'aurait aucun moyen de connaître le mot de passe défini pour elle.
 */
export async function sendAccountCreatedEmail({
    email,
    name,
    role,
    password,
    invitedBy,
}: {
    email: string;
    name: string;
    role: Role;
    password: string;
    invitedBy: string;
}) {
    const brand = await loadBrand();
    await send({
        to: email,
        subject: `Votre accès à ${brand.siteName}`,
        html: renderEmail({
            brand,
            preheader: "Vos identifiants de connexion.",
            title: `Bonjour ${esc(name)},`,
            intro: `${esc(invitedBy)} vous a créé un compte <strong style="color:${C.ink};">${esc(ROLE_LABELS[role])}</strong> sur ${esc(brand.siteName)}. Voici vos identifiants de connexion.`,
            body:
                kvTable([
                    ["Email", esc(email)],
                    ["Mot de passe", `<span style="font-family:monospace;">${esc(password)}</span>`],
                ]) +
                `<p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">À votre première connexion, un code à 6 chiffres vous sera envoyé pour confirmer votre adresse. Pensez à changer ce mot de passe une fois connecté.</p>`,
            ctas: [{ label: "Se connecter", url: `${APP_URL}/login` }],
        }),
    });
}

/**
 * Message du formulaire /contact, envoyé à l'adresse de contact du site avec le
 * visiteur en reply-to : une réponse directe depuis la boîte mail suffit.
 */
export async function sendContactMessageEmail({
    to,
    siteName,
    fromName,
    fromEmail,
    subject,
    message,
}: {
    to: string;
    siteName: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    message: string;
}) {
    const brand = await loadBrand();
    await send({
        to,
        subject: `[${siteName}] ${subject}`,
        replyTo: fromEmail,
        html: renderEmail({
            brand,
            preheader: `${fromName} : ${subject}`,
            title: "Nouveau message via le formulaire de contact",
            intro: esc(subject),
            body:
                kvTable([["De", `${esc(fromName)} &lt;${esc(fromEmail)}&gt;`]]) +
                `<p style="margin:0;font-size:15px;color:${C.ink};line-height:1.7;white-space:pre-wrap;">${esc(message)}</p>
<p style="margin:24px 0 0;font-size:13px;color:#94A3B8;line-height:1.6;">Répondre à cet email revient directement à ${esc(fromEmail)}.</p>`,
        }),
    });
}
