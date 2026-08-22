"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { IconPhoto, IconVideo, IconX } from "@tabler/icons-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "./media-uploader";
import { MediaSidebar } from "./media-sidebar";
import { MediaThumbGrid } from "./media-thumb-grid";
import type { MediaItem } from "./media-utils";

interface MediaGridProps {
    media: MediaItem[];
    cloudName: string;
}

const DATE_OPTIONS = [
    { value: "ALL", label: "Toutes dates" },
    { value: "today", label: "Aujourd'hui" },
    { value: "week", label: "7 derniers jours" },
    { value: "month", label: "30 derniers jours" },
];

export function MediaGrid({ media: initialMedia, cloudName }: MediaGridProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState<MediaItem | null>(null);
    const [media, setMedia] = useState(initialMedia);

    // Resynchronise avec le serveur après revalidatePath / router.refresh
    // (upload, crop enregistré…) — ajustement pendant le render, pas d'effect
    const [prevInitial, setPrevInitial] = useState(initialMedia);
    if (prevInitial !== initialMedia) {
        setPrevInitial(initialMedia);
        setMedia(initialMedia);
    }

    const typeFilter = searchParams.get("type") ?? "";
    const dateFilter = searchParams.get("date") ?? "";

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "ALL") params.set(key, value);
        else params.delete(key);
        router.push(`${pathname}?${params.toString()}`);
    }

    function handleDelete(id: string) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setSelected(null);
    }

    const hasFilters = typeFilter || dateFilter;

    return (
        <div className="space-y-5">
            <MediaUploader />

            {/* Filters */}
            <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres médiathèque">
                <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                    {(["", "IMAGE", "VIDEO"] as const).map((type) => (
                        <Button
                            key={type || "ALL"}
                            variant={typeFilter === type ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1.5"
                            onClick={() => setParam("type", type)}
                        >
                            {type === "IMAGE" && <IconPhoto size={13} />}
                            {type === "VIDEO" && <IconVideo size={13} />}
                            {type === "" ? "Tous" : type === "IMAGE" ? "Images" : "Vidéos"}
                        </Button>
                    ))}
                </div>

                <Select value={dateFilter || "ALL"} onValueChange={(v) => setParam("date", v)}>
                    <SelectTrigger className="w-44 h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DATE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={() => router.push(pathname)} className="gap-1.5">
                        <IconX size={14} />
                        Réinitialiser
                    </Button>
                )}
            </nav>

            {/* Grid */}
            {media.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                    Aucun fichier{hasFilters ? " pour ces filtres" : ""}. Importez votre premier média ci-dessus.
                </p>
            ) : (
                <MediaThumbGrid
                    media={media}
                    cloudName={cloudName}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                />
            )}

            <MediaSidebar
                media={selected}
                cloudName={cloudName}
                onClose={() => setSelected(null)}
                onDelete={handleDelete}
            />
        </div>
    );
}
