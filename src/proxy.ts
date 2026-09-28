import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Le routing par locale (next-intl) ne s'applique qu'aux routes publiques
// localisées sous [locale] — jamais à l'admin/auth, qui restent en français
// non préfixé. Un seul fichier proxy est autorisé par Next.js : on combine
// donc ici la logique d'auth existante et le routing i18n.
const handleI18nRouting = createIntlMiddleware(routing);

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
const PROTECTED_ROUTES = ["/dashboard"];

function isAuthRoute(path: string) {
    return AUTH_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}

function isProtectedRoute(path: string) {
    return PROTECTED_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}

/** Espace client : protégé comme l'admin, mais localisé (/account, /en/account). */
function isAccountRoute(path: string) {
    const bare = path.replace(/^\/en(?=\/|$)/, "") || "/";
    return bare === "/account" || bare.startsWith("/account/");
}

function roleRedirect(role: string): string {
    // Redirection optimiste uniquement : les layouts revalident la session et
    // le rôle côté serveur.
    if (role === "CLIENT") return "/account";
    return "/dashboard";
}

export async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;

    if (isAccountRoute(path)) {
        if (!getSessionCookie(req)) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.search = "";
            url.searchParams.set("callbackUrl", path);
            return NextResponse.redirect(url);
        }
        return handleI18nRouting(req);
    }

    // Espace admin/auth : non localisé, on ne fait jamais passer next-intl dessus.
    if (isProtectedRoute(path) || isAuthRoute(path)) {
        // Optimistic check: read session cookie (no DB call — per Next.js proxy best practices)
        // getSessionCookie gère le préfixe "__Secure-" que better-auth ajoute en HTTPS :
        // le lire en dur échouerait systématiquement en production.
        const isAuthenticated = !!getSessionCookie(req);

        // Role cookie set by the app after sign-in for optimistic redirects
        const role = req.cookies.get("np-role")?.value ?? "";

        // Protected route → not authenticated → redirect to login
        if (isProtectedRoute(path) && !isAuthenticated) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("callbackUrl", path);
            return NextResponse.redirect(url);
        }

        // Auth route → already authenticated → redirect to appropriate home
        if (isAuthRoute(path) && isAuthenticated) {
            const url = req.nextUrl.clone();
            url.pathname = roleRedirect(role);
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    // Tout le reste (routes publiques) : routing par locale next-intl.
    return handleI18nRouting(req);
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|feed).*)",
    ],
};
