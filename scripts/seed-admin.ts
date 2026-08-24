import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME ?? "Admin";

    if (!email || !password) {
        throw new Error(
            "ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env avant de lancer ce script.",
        );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`Un compte existe déjà pour ${email} (role: ${existing.role}). Rien à faire.`);
        return;
    }

    // auth.api.createUser sans headers passe outre la vérification de permission
    // (réservée aux appels HTTP authentifiés) : c'est le chemin normal pour un seed.
    const { user } = await auth.api.createUser({
        body: {
            email,
            password,
            name,
            role: "ADMIN",
            data: { emailVerified: true },
        },
    });

    console.log(`Compte admin créé : ${user.email} (id: ${user.id}).`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
