import "dotenv/config";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Comptes de démonstration pour les prospects : un Éditeur (dashboard) et un
 * Client (boutique + espace client). Créés déjà vérifiés, sans code OTP.
 * Mots de passe lus dans .env (DEMO_EDITOR_PASSWORD, DEMO_CLIENT_PASSWORD).
 *
 * Usage : pnpm tsx scripts/seed-demo-accounts.ts
 */
const ACCOUNTS: { email: string; name: string; role: Role; passwordEnv: string }[] = [
    {
        email: "demo-admin@eurocontainermarket.com",
        name: "Démo Back-office",
        role: "EDITOR",
        passwordEnv: "DEMO_EDITOR_PASSWORD",
    },
    {
        email: "demo-client@eurocontainermarket.com",
        name: "Démo Client",
        role: "CLIENT",
        passwordEnv: "DEMO_CLIENT_PASSWORD",
    },
];

async function main() {
    for (const account of ACCOUNTS) {
        const password = process.env[account.passwordEnv];
        if (!password) {
            throw new Error(`${account.passwordEnv} doit être défini dans .env avant de lancer ce script.`);
        }

        const existing = await prisma.user.findUnique({ where: { email: account.email } });
        if (existing) {
            console.log(`Un compte existe déjà pour ${account.email} (role: ${existing.role}). Ignoré.`);
            continue;
        }

        // Sans headers, auth.api.createUser passe outre la vérification de permission (cf. seed-admin).
        const { user } = await auth.api.createUser({
            body: {
                email: account.email,
                password,
                name: account.name,
                role: account.role,
                data: { emailVerified: true },
            },
        });

        console.log(`Compte de démo créé : ${user.email} (${account.role}).`);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
