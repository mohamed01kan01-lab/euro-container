"use client";

import { useState, useTransition } from "react";
import { IconCopy, IconTrash, IconCheck, IconCrop, IconLoader2 } from "@tabler/icons-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteMedia } from "@/app/(admin)/dashboard/media/actions";
import { buildCloudinaryUrl, formatBytes, type MediaItem } from "./media-utils";
import { ImageCropDialog } from "./image-crop-dialog";

// Ré-exports de compatibilité pour les importeurs existants
export { buildCloudinaryUrl } from "./media-utils";
export type { MediaItem } from "./media-utils";

// ─── Transforms prédéfinis ────────────────────────────────────────────────────

const TRANSFORM_LABELS: Record<string, string> = {
    thumbnail: "c_thumb,w_150,h_150",
    medium: "c_fit,w_600,h_600",
    large: "c_fit,w_1200,h_1200",
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ url, label }: { url: string; label: string }) {
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            toast.success("URL copiée");
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1 capitalize">
                {label}
            </span>
            <code className="text-xs text-muted-foreground/70 truncate max-w-30 hidden sm:block">
                …/{label}
            </code>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={copy}
                aria-label={`Copier URL ${label}`}
            >
                {copied ? (
                    <IconCheck size={13} className="text-green-500" />
                ) : (
                    <IconCopy size={13} />
                )}
            </Button>
        </div>
    );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

interface MediaSidebarProps {
    media: MediaItem | null;
    cloudName: string;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export function MediaSidebar({
    media,
    cloudName,
    onClose,
    onDelete,
}: MediaSidebarProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cropOpen, setCropOpen] = useState(false);
    const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // L'URL recadrée est liée au média courant — on la vide quand il change
    const [prevMediaId, setPrevMediaId] = useState(media?.id);
    if (media?.id !== prevMediaId) {
        setPrevMediaId(media?.id);
        setCroppedUrl(null);
    }

    function handleDelete() {
        if (!media) return;
        startTransition(async () => {
            try {
                await deleteMedia(media.id);
                toast.success("Média supprimé");
                onDelete(media.id);
            } catch {
                toast.error("Erreur lors de la suppression");
            } finally {
                setDeleteOpen(false);
            }
        });
    }

    return (
        <>
            <Sheet open={!!media} onOpenChange={(o) => !o && onClose()}>
                <SheetContent
                    side="right"
                    className="w-80 overflow-y-auto flex flex-col gap-0 p-0"
                >
                    {media && (
                        <>
                            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                                <SheetTitle className="text-sm font-medium truncate text-left">
                                    {media.name}
                                </SheetTitle>
                            </SheetHeader>

                            <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
                                {/* Preview */}
                                <figure className="rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                                    {media.type === "VIDEO" ? (
                                        <video
                                            src={media.url}
                                            className="w-full h-full object-contain"
                                            controls
                                        />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={buildCloudinaryUrl(
                                                media.publicId,
                                                cloudName,
                                                "IMAGE",
                                                "c_fit,w_600,h_600",
                                            )}
                                            alt={media.name}
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                </figure>

                                {/* Info */}
                                <dl className="space-y-1.5 text-sm">
                                    {media.format && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Format
                                            </dt>
                                            <dd className="font-medium uppercase">
                                                {media.format}
                                            </dd>
                                        </div>
                                    )}
                                    {media.size !== null && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Taille
                                            </dt>
                                            <dd className="font-medium">
                                                {formatBytes(media.size)}
                                            </dd>
                                        </div>
                                    )}
                                    {media.width && media.height && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                Dimensions
                                            </dt>
                                            <dd className="font-medium">
                                                {media.width} × {media.height}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">
                                            Ajouté le
                                        </dt>
                                        <dd className="font-medium">
                                            {new Intl.DateTimeFormat("fr-FR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            }).format(
                                                new Date(media.createdAt),
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                <Separator />

                                {/* URLs */}
                                <aside aria-label="URLs du média">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                        URLs
                                    </p>
                                    <div className="space-y-1.5">
                                        {Object.entries(TRANSFORM_LABELS).map(
                                            ([label, transform]) => (
                                                <CopyButton
                                                    key={label}
                                                    label={label}
                                                    url={buildCloudinaryUrl(
                                                        media.publicId,
                                                        cloudName,
                                                        media.type,
                                                        transform,
                                                    )}
                                                />
                                            ),
                                        )}
                                        <CopyButton
                                            label="original"
                                            url={media.url}
                                        />
                                        {croppedUrl && (
                                            <CopyButton
                                                label="recadrée"
                                                url={croppedUrl}
                                            />
                                        )}
                                    </div>
                                </aside>

                                {media.type === "IMAGE" && cloudName && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setCropOpen(true)}
                                    >
                                        <IconCrop size={14} className="mr-2" />
                                        Recadrer / redimensionner
                                    </Button>
                                )}

                                <Separator />

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <IconTrash size={14} className="mr-2" />
                                    Supprimer
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {media && media.type === "IMAGE" && cloudName && (
                <ImageCropDialog
                    media={media}
                    cloudName={cloudName}
                    open={cropOpen}
                    onOpenChange={setCropOpen}
                    onApply={(url) => {
                        setCroppedUrl(url);
                        navigator.clipboard.writeText(url).then(() => {
                            toast.success("URL recadrée copiée");
                        });
                    }}
                />
            )}

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce fichier ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Le fichier sera supprimé définitivement de
                            Cloudinary et de la base de données.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                // Garde le dialog ouvert pendant la suppression (spinner visible)
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={pending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {pending && <IconLoader2 size={14} className="mr-1.5 animate-spin" />}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
