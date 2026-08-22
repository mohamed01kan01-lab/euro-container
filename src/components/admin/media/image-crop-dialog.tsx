"use client";

import { useCallback, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { IconDeviceFloppy, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { saveCroppedMedia } from "@/app/(admin)/dashboard/media/actions";
import {
    buildCloudinaryUrl,
    buildCropTransform,
    type MediaItem,
} from "./media-utils";

// ─── Presets ──────────────────────────────────────────────────────────────────

const RATIOS: { value: string; label: string; ratio: number | null }[] = [
    { value: "original", label: "Original", ratio: null },
    { value: "1:1", label: "1:1", ratio: 1 },
    { value: "4:3", label: "4:3", ratio: 4 / 3 },
    { value: "3:2", label: "3:2", ratio: 3 / 2 },
    { value: "16:9", label: "16:9", ratio: 16 / 9 },
    { value: "9:16", label: "9:16", ratio: 9 / 16 },
];

const OUTPUT_SIZES = [
    { value: "original", label: "Originale" },
    { value: "1600", label: "1600 px" },
    { value: "1200", label: "1200 px" },
    { value: "800", label: "800 px" },
    { value: "400", label: "400 px" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ImageCropDialogProps {
    media: MediaItem;
    cloudName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (url: string) => void;
    onSaved?: () => void;
}

export function ImageCropDialog({
    media,
    cloudName,
    open,
    onOpenChange,
    onApply,
    onSaved,
}: ImageCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [ratioKey, setRatioKey] = useState("original");
    const [outputSize, setOutputSize] = useState("original");
    const [areaPixels, setAreaPixels] = useState<Area | null>(null);
    const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
    const [saving, startSaving] = useTransition();

    // Réinitialise l'état à chaque ouverture (ajustement pendant le render,
    // cf. react.dev "adjusting state when a prop changes")
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRatioKey("original");
            setOutputSize("original");
            setAreaPixels(null);
        }
    }

    // Aperçu allégé si les dimensions originales sont connues, sinon l'original
    // (garantit un mapping exact des pixels quand width est null)
    const imageSrc = media.width
        ? buildCloudinaryUrl(media.publicId, cloudName, "IMAGE", "c_limit,w_1600")
        : media.url;

    const originalRatio =
        media.width && media.height ? media.width / media.height : 4 / 3;
    const aspect =
        RATIOS.find((r) => r.value === ratioKey)?.ratio ?? originalRatio;

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setAreaPixels(croppedAreaPixels);
    }, []);

    function computeTransform(): string | null {
        if (!areaPixels) return null;
        // Remise à l'échelle des pixels de l'aperçu vers l'image originale
        const scale =
            media.width && naturalWidth ? media.width / naturalWidth : 1;
        return buildCropTransform(
            {
                x: areaPixels.x * scale,
                y: areaPixels.y * scale,
                width: areaPixels.width * scale,
                height: areaPixels.height * scale,
            },
            {
                outputWidth: outputSize === "original" ? null : Number(outputSize),
                maxWidth: media.width,
                maxHeight: media.height,
            },
        );
    }

    function handleApply() {
        const transform = computeTransform();
        if (!transform) return;
        onApply(buildCloudinaryUrl(media.publicId, cloudName, "IMAGE", transform));
        onOpenChange(false);
    }

    function handleSaveToLibrary() {
        const transform = computeTransform();
        if (!transform) return;
        startSaving(async () => {
            try {
                await saveCroppedMedia(media.publicId, transform, media.name);
                toast.success("Version recadrée enregistrée dans la médiathèque");
                onSaved?.();
                onOpenChange(false);
            } catch {
                toast.error("Erreur lors de l'enregistrement");
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Recadrer l&apos;image</DialogTitle>
                    <DialogDescription>
                        Recadrage non destructif — l&apos;original est conservé.
                    </DialogDescription>
                </DialogHeader>

                <section className="space-y-4" aria-label="Zone de recadrage">
                    <div className="relative h-72 sm:h-96 rounded-lg overflow-hidden bg-muted">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            onMediaLoaded={(size) =>
                                setNaturalWidth(size.naturalWidth)
                            }
                            restrictPosition
                        />
                    </div>

                    {/* Ratio */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">Ratio</Label>
                        <ToggleGroup
                            type="single"
                            value={ratioKey}
                            onValueChange={(v) => v && setRatioKey(v)}
                            variant="outline"
                            size="sm"
                            className="flex-wrap justify-start"
                        >
                            {RATIOS.map((r) => (
                                <ToggleGroupItem
                                    key={r.value}
                                    value={r.value}
                                    className="text-xs px-2.5"
                                >
                                    {r.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Zoom */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Zoom</Label>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.05}
                                onValueChange={([v]) => setZoom(v)}
                                aria-label="Zoom"
                            />
                        </div>

                        {/* Output size */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Taille de sortie (largeur max)</Label>
                            <Select value={outputSize} onValueChange={setOutputSize}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {OUTPUT_SIZES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!areaPixels || saving}
                        onClick={handleSaveToLibrary}
                    >
                        {saving ? (
                            <IconLoader2 size={14} className="mr-1.5 animate-spin" />
                        ) : (
                            <IconDeviceFloppy size={14} className="mr-1.5" />
                        )}
                        Enregistrer dans la médiathèque
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={!areaPixels}
                        onClick={handleApply}
                    >
                        <IconCheck size={14} className="mr-1.5" />
                        Appliquer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
