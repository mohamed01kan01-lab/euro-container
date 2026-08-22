/**
 * Traduction des codes d'erreur better-auth en messages clairs en français.
 * Les codes proviennent de BASE_ERROR_CODES (@better-auth/core) et du plugin
 * email-otp (OTP_EXPIRED, INVALID_OTP, TOO_MANY_ATTEMPTS).
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
    // Connexion
    INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
    INVALID_PASSWORD: "Mot de passe incorrect.",
    INVALID_EMAIL: "Cette adresse email n'est pas valide.",
    USER_NOT_FOUND: "Aucun compte ne correspond à cet email.",
    EMAIL_NOT_VERIFIED: "Votre email n'est pas encore vérifié.",
    CREDENTIAL_ACCOUNT_NOT_FOUND:
        "Ce compte utilise une autre méthode de connexion.",

    // Inscription
    USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
        "Un compte existe déjà avec cet email. Essayez-en un autre.",
    PASSWORD_TOO_SHORT: "Mot de passe trop court (8 caractères minimum).",
    PASSWORD_TOO_LONG: "Mot de passe trop long.",
    FAILED_TO_CREATE_USER: "Impossible de créer le compte. Réessayez.",
    EMAIL_ALREADY_VERIFIED: "Cet email est déjà vérifié.",

    // Codes OTP
    INVALID_OTP: "Code incorrect. Vérifiez les 6 chiffres saisis.",
    OTP_EXPIRED: "Ce code a expiré. Demandez-en un nouveau.",
    TOO_MANY_ATTEMPTS:
        "Trop de tentatives. Demandez un nouveau code pour réessayer.",

    // Session
    SESSION_EXPIRED: "Votre session a expiré. Reconnectez-vous.",
    FAILED_TO_CREATE_SESSION: "Impossible d'ouvrir la session. Réessayez.",
};

const FALLBACK = "Une erreur est survenue. Réessayez dans un instant.";

/** Erreur réseau / serveur injoignable : `fetch` rejette sans code ni statut. */
const NETWORK_ERROR =
    "Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.";

type AuthError = {
    code?: string;
    message?: string;
    status?: number;
} | null;

export function getAuthErrorMessage(error: AuthError): string {
    if (!error) return FALLBACK;
    if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
        return AUTH_ERROR_MESSAGES[error.code];
    }
    if (error.status === 429) {
        return "Trop de tentatives. Patientez une minute avant de réessayer.";
    }
    if (error.status && error.status >= 500) {
        return "Le serveur a rencontré un problème. Réessayez dans un instant.";
    }
    // Sans code connu, on n'affiche pas le message brut de better-auth (en anglais).
    return FALLBACK;
}

/** À utiliser dans un `catch` : distingue la panne réseau du reste. */
export function getThrownErrorMessage(err: unknown): string {
    if (err instanceof TypeError) return NETWORK_ERROR;
    return FALLBACK;
}
