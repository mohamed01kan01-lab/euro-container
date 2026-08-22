"use server";

import { v2 as cloudinary } from "cloudinary";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import type { MediaType } from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
        throw new Error("Non autorisé");
    }
}

// ─── Cloudinary config ────────────────────────────────────────────────────────

async function configureCloudinary(): Promise<string> {
    const settings = await getSiteSettings();
    if (!settings.cloudinaryCloudName || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
        throw new Error(
            "Cloudinary n'est pas configuré. Renseignez vos credentials dans Paramètres → Intégrations."
        );
    }
    cloudinary.config({
        cloud_name: settings.cloudinaryCloudName,
        api_key: settings.cloudinaryApiKey,
        api_secret: settings.cloudinaryApiSecret,
    });
    return settings.cloudinaryCloudName;
}

export async function getCloudName(): Promise<string> {
    const settings = await getSiteSettings();
    return settings.cloudinaryCloudName ?? "";
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getMediaList(filters: {
    type?: MediaType;
    date?: "today" | "week" | "month";
}) {
    const now = new Date();
    let gte: Date | undefined;

    if (filters.date === "today") {
        gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filters.date === "week") {
        gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filters.date === "month") {
        gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return prisma.media.findMany({
        where: {
            ...(filters.type && { type: filters.type }),
            ...(gte && { createdAt: { gte } }),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadMedia(formData: FormData): Promise<void> {
    await requireAdmin();
    await configureCloudinary();

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) throw new Error("Fichier manquant");
    if (file.size > 20 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 20MB)");

    const bytes = await file.arrayBuffer();
    const b64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        folder: "nextpress",
        resource_type: "auto",
    });

    await prisma.media.create({
        data: {
            publicId: result.public_id,
            url: result.secure_url,
            type: result.resource_type === "video" ? "VIDEO" : "IMAGE",
            name: file.name,
            size: result.bytes ?? null,
            width: result.width ?? null,
            height: result.height ?? null,
            format: result.format ?? null,
        },
    });

    revalidatePath("/dashboard/media");
}

// ─── Save cropped version ─────────────────────────────────────────────────────

export async function saveCroppedMedia(
    publicId: string,
    transform: string,
    name: string,
): Promise<void> {
    await requireAdmin();
    const cloudName = await configureCloudinary();

    const sourceUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;

    const result = await cloudinary.uploader.upload(sourceUrl, {
        folder: "nextpress",
        resource_type: "image",
    });

    await prisma.media.create({
        data: {
            publicId: result.public_id,
            url: result.secure_url,
            type: "IMAGE",
            name: `${name} (recadrée)`,
            size: result.bytes ?? null,
            width: result.width ?? null,
            height: result.height ?? null,
            format: result.format ?? null,
        },
    });

    revalidatePath("/dashboard/media");
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMedia(id: string): Promise<void> {
    await requireAdmin();

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw new Error("Média introuvable");

    await configureCloudinary();

    try {
        await cloudinary.uploader.destroy(media.publicId, {
            resource_type: media.type === "VIDEO" ? "video" : "image",
        });
    } catch {
        // Cloudinary may already not have the file — proceed to delete from DB
    }

    await prisma.media.delete({ where: { id } });
    revalidatePath("/dashboard/media");
}
