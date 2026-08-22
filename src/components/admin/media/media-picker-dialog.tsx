"use client";

import { useEffect, useRef, useState } from "react";
import { IconCrop, IconSearch, IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getMediaList,
    getCloudName,
} from "@/app/(admin)/dashboard/media/actions";
import { MediaThumbGrid } from "./media-thumb-grid";
import { MediaUploader } from "./media-uploader";
import { ImageCropDialog } from "./image-crop-dialog";
import type { MediaItem } from "./media-utils";

// ─── Component ────────────────────────────────────────────────────────────────

interface MediaPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (url: string, item: MediaItem) => void;
    accept?: "image" | "video" | "all";
    enableCrop?: boolean;
    title?: string;
}

export function MediaPickerDialog({
    open,
    onOpenChange,
    onSelect,
    accept = "image",
    enableCrop = true,
    title = "Choisir un média",
}: MediaPickerDialogProps) {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [cloudName, setCloudName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<MediaItem | null>(null);
    const [tab, setTab] = useState("library");
    const [cropOpen, setCropOpen] = useState(false);
    const fetchIdRef = useRef(0);

    async function fetchMedia() {
        const fetchId = ++fetchIdRef.current;
        setLoading(true);
        setError(false);
        try {
            const [list, name] = await Promise.all([
                getMediaList({
                    type:
                        accept === "all"
                            ? undefined
                            : accept === "video"
                              ? "VIDEO"
                              : "IMAGE",
                }),
                getCloudName(),
            ]);
            // Ignore les réponses périmées (dialog fermé/rouvert pendant le fetch)
            if (fetchId !== fetchIdRef.current) return;
            setMedia(
                list.map((m) => ({
                    ...m,
                    createdAt: m.createdAt.toISOString(),
                })),
            );
            setCloudName(name);
        } catch {
            if (fetchId !== fetchIdRef.current) return;
            setError(true);
            toast.error("Impossible de charger la médiathèque");
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }

    // Reset de l'état à l'ouverture (ajustement pendant le render)
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setSelected(null);
            setSearch("");
            setTab("library");
        }
    }

    // Le fetch reste dans un effect (synchronisation avec un système externe)
    useEffect(() => {
        if (open) fetchMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const filtered = search
        ? media.filter((m) =>
              m.name.toLowerCase().includes(search.toLowerCase()),
          )
        : media;

    function handleSelect() {
        if (!selected) return;
        onSelect(selected.url, selected);
        onOpenChange(false);
    }

    const canCrop =
        enableCrop && selected?.type === "IMAGE" && Boolean(cloudName);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList>
                            <TabsTrigger value="library">Médiathèque</TabsTrigger>
                            <TabsTrigger value="upload">Importer</TabsTrigger>
                        </TabsList>

                        <TabsContent value="library" className="space-y-3 mt-3">
                            <div className="relative">
                                <IconSearch
                                    size={15}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden
                                />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher par nom…"
                                    className="pl-8 h-9"
                                />
                            </div>

                            <ScrollArea className="h-96">
                                {loading ? (
                                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="list">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <li key={i}>
                                                <Skeleton className="aspect-square rounded-lg" />
                                            </li>
                                        ))}
                                    </ul>
                                ) : error ? (
                                    <div className="flex flex-col items-center gap-3 py-16">
                                        <p className="text-sm text-muted-foreground">
                                            Erreur de chargement.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchMedia}
                                        >
                                            Réessayer
                                        </Button>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-16">
                                        {search
                                            ? "Aucun média ne correspond à la recherche."
                                            : "Aucun média. Importez votre premier fichier via l'onglet Importer."}
                                    </p>
                                ) : (
                                    <MediaThumbGrid
                                        media={filtered}
                                        cloudName={cloudName}
                                        selectedId={selected?.id ?? null}
                                        onSelect={setSelected}
                                    />
                                )}
                            </ScrollArea>

                            {!cloudName && !loading && !error && (
                                <p className="text-xs text-muted-foreground">
                                    Configurez Cloudinary dans Paramètres →
                                    Intégrations pour activer les aperçus et le
                                    recadrage.
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="upload" className="mt-3">
                            <MediaUploader
                                compact
                                onUploaded={() => {
                                    setTab("library");
                                    fetchMedia();
                                }}
                            />
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex-col sm:flex-row sm:items-center gap-2">
                        {selected && (
                            <span className="text-xs text-muted-foreground truncate sm:mr-auto">
                                {selected.name}
                            </span>
                        )}
                        {canCrop && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCropOpen(true)}
                            >
                                <IconCrop size={14} className="mr-1.5" />
                                Recadrer
                            </Button>
                        )}
                        <Button
                            type="button"
                            size="sm"
                            disabled={!selected}
                            onClick={handleSelect}
                        >
                            <IconCheck size={14} className="mr-1.5" />
                            Sélectionner
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selected && canCrop && (
                <ImageCropDialog
                    media={selected}
                    cloudName={cloudName}
                    open={cropOpen}
                    onOpenChange={setCropOpen}
                    onApply={(url) => {
                        onSelect(url, selected);
                        setCropOpen(false);
                        onOpenChange(false);
                    }}
                    onSaved={fetchMedia}
                />
            )}
        </>
    );
}
