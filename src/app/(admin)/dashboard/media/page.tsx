import type { Metadata } from "next";
import type { MediaType } from "@prisma/client";
import { getMediaList, getCloudName } from "./actions";
import { MediaGrid } from "@/components/admin/media/media-grid";
import type { MediaItem } from "@/components/admin/media/media-utils";

export const metadata: Metadata = { title: "Médiathèque" };

interface PageProps {
    searchParams: Promise<{ type?: string; date?: string }>;
}

export default async function MediaPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const validTypes: MediaType[] = ["IMAGE", "VIDEO"];
    const type = validTypes.includes(params.type as MediaType)
        ? (params.type as MediaType)
        : undefined;

    const validDates = ["today", "week", "month"] as const;
    const date = validDates.includes(params.date as (typeof validDates)[number])
        ? (params.date as (typeof validDates)[number])
        : undefined;

    const [media, cloudName] = await Promise.all([
        getMediaList({ type, date }),
        getCloudName(),
    ]);

    const serialized: MediaItem[] = media.map((m) => ({
        id: m.id,
        publicId: m.publicId,
        url: m.url,
        type: m.type as "IMAGE" | "VIDEO",
        name: m.name,
        size: m.size,
        width: m.width,
        height: m.height,
        format: m.format,
        createdAt: m.createdAt.toISOString(),
    }));

    return (
        <section className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold">Médiathèque</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {media.length} fichier{media.length !== 1 ? "s" : ""}
                </p>
            </header>
            <MediaGrid media={serialized} cloudName={cloudName} />
        </section>
    );
}
