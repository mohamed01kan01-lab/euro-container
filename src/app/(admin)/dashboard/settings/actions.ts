"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ID = "singleton";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
}

export async function getSiteSettings() {
    return prisma.siteSettings.upsert({
        where: { id: ID },
        create: { id: ID },
        update: {},
    });
}

export async function updateSiteSettings(
    data: Record<string, string | boolean | null | undefined>,
) {
    await requireAdmin();
    return prisma.siteSettings.upsert({
        where: { id: ID },
        create: { id: ID, ...data },
        update: data,
    });
}
