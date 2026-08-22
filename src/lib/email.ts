import { Resend } from "resend";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/roles";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "NextPress <noreply@nextpress.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Envoi ───────────────────────────────────────────────────────────────────

/**
 * Le SDK Resend ne rejette jamais : il résout vers { data, error }. Sans cette
 * inspection, un envoi refusé (domaine non vérifié, clé absente, destinataire
 * interdit en mode test) passerait pour un succès.
 */
async function send(payload: {
    to: string;
    subject: string;
    html: string;
}) {
    const { error } = await resend.emails.send({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    });

    if (error) {
        const detail = [error.name, error.message].filter(Boolean).join(" — ");
        console.error("[email] Envoi refusé par Resend :", error);
        throw new Error(`Envoi de l'email impossible : ${detail}`);
    }
}

// ─── Senders ─────────────────────────────────────────────────────────────────

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
    await send({
        to: email,
        subject: subjects[type] ?? "Votre code de vérification",
        html: otpHtml(otp, type),
    });
}

export async function sendWelcomeEmail({ email, name }: { email: string; name: string }) {
    await send({
        to: email,
        subject: "Bienvenue sur NextPress 🎉",
        html: welcomeHtml(name),
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
    await send({
        to: email,
        subject: "Votre accès à NextPress",
        html: accountCreatedHtml({ email, name, role, password, invitedBy }),
    });
}

// ─── Templates ───────────────────────────────────────────────────────────────

function otpHtml(otp: string, type: string) {
    const messages: Record<string, string> = {
        "email-verification": "Entrez ce code pour vérifier votre adresse email.",
        "forget-password": "Entrez ce code pour réinitialiser votre mot de passe.",
        "sign-in": "Entrez ce code pour vous connecter.",
        "change-email": "Entrez ce code pour confirmer votre nouvel email.",
    };
    const message = messages[type] ?? "Entrez ce code pour continuer.";

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #F1F5F9;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#0F172A;">NextPress</p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0F172A;">Votre code de vérification</p>
          <p style="margin:0 0 32px;font-size:15px;color:#64748B;line-height:1.6;">${message}</p>
          <div style="background:#EFF6FF;border:2px solid #BFDBFE;border-radius:10px;padding:24px;text-align:center;margin-bottom:32px;">
            <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#2563EB;">${otp}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">Ce code expire dans <strong>5 minutes</strong>.<br>Si vous n'avez pas effectué cette action, ignorez cet email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeHtml(name: string) {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #F1F5F9;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#0F172A;">NextPress</p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0F172A;">Bienvenue, ${name} 👋</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6;">Votre compte est prêt. Vérifiez votre email pour activer votre compte, puis accédez à votre espace.</p>
          <a href="${APP_URL}/login" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">Accéder à mon espace →</a>
        </td></tr>
        <tr><td style="padding-top:40px;border-top:1px solid #F1F5F9;margin-top:40px;">
          <p style="margin:16px 0 0;font-size:13px;color:#94A3B8;line-height:1.6;">
            NextPress — L'alternative moderne à WordPress.<br>
            Liberté totale sur votre frontend, zéro thème payant.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function accountCreatedHtml({
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
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #F1F5F9;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#0F172A;">NextPress</p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0F172A;">Bonjour ${name},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6;">
            ${invitedBy} vous a créé un compte <strong style="color:#0F172A;">${ROLE_LABELS[role]}</strong> sur NextPress.
            Voici vos identifiants de connexion.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr><td style="padding-bottom:12px;">
              <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;">Email</p>
              <p style="margin:0;font-size:15px;color:#0F172A;font-weight:600;">${email}</p>
            </td></tr>
            <tr><td>
              <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;">Mot de passe</p>
              <p style="margin:0;font-size:15px;color:#0F172A;font-weight:600;font-family:monospace;">${password}</p>
            </td></tr>
          </table>

          <a href="${APP_URL}/login" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">Se connecter →</a>

          <p style="margin:28px 0 0;font-size:13px;color:#94A3B8;line-height:1.6;">
            À votre première connexion, un code de vérification à 6 chiffres vous sera envoyé par email pour confirmer votre adresse.<br>
            Pensez à changer ce mot de passe une fois connecté.
          </p>
        </td></tr>
        <tr><td style="padding-top:40px;border-top:1px solid #F1F5F9;margin-top:40px;">
          <p style="margin:16px 0 0;font-size:13px;color:#94A3B8;line-height:1.6;">
            NextPress — L'alternative moderne à WordPress.<br>
            Liberté totale sur votre frontend, zéro thème payant.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
