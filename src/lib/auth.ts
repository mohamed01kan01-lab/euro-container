import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendVerificationOtpEmail, sendWelcomeEmail } from "@/lib/email";
import { ac, ADMIN, EDITOR, CLIENT } from "@/lib/auth-permissions";

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET!,

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },

    session: {
        // Évite une requête SQL à chaque getSession() côté serveur : la session
        // est relue depuis un cookie signé pendant maxAge.
        // Contrepartie : une session révoquée ou un rôle modifié peuvent rester
        // actifs jusqu'à 5 minutes sur les autres appareils.
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },

    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 300,
            allowedAttempts: 3,
            sendVerificationOnSignUp: true,
            overrideDefaultEmailVerification: true,
            sendVerificationOTP: async ({ email, otp, type }) => {
                // L'envoi doit être attendu : une promesse rejetée non capturée
                // ici termine le process Node et coupe la requête en cours.
                await sendVerificationOtpEmail({ email, otp, type });
            },
        }),
        admin({
            ac,
            defaultRole: "CLIENT",
            adminRoles: ["ADMIN", "EDITOR"],
            roles: { ADMIN, EDITOR, CLIENT },
        }),
        nextCookies(),
    ],

    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // L'email de bienvenue ne doit jamais faire échouer l'inscription,
                    // mais son échec ne doit pas non plus tuer le process.
                    try {
                        await sendWelcomeEmail({
                            email: user.email,
                            name: user.name,
                        });
                    } catch (err) {
                        console.error(
                            "[auth] Envoi de l'email de bienvenue échoué :",
                            err,
                        );
                    }
                },
            },
        },
    },
});

export type Session = typeof auth.$Infer.Session;
