"use client";

import { useState } from "react";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPickerDialog } from "./media-picker-dialog";

// ─── Component ────────────────────────────────────────────────────────────────

interface MediaInputProps {
    value: string;
    onChange: (url: string) => void;
    accept?: "image" | "video" | "all";
    enableCrop?: boolean;
    placeholder?: string;
    previewAspectClass?: string;
    id?: string;
}

export function MediaInput({
    value,
    onChange,
    accept = "image",
    enableCrop = true,
    placeholder = "https://…",
    previewAspectClass = "aspect-video",
    id,
}: MediaInputProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [previewError, setPreviewError] = useState(false);

    function handleChange(url: string) {
        setPreviewError(false);
        onChange(url);
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    className="text-sm"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-9"
                    onClick={() => setPickerOpen(true)}
                >
                    <IconPhoto size={14} className="mr-1.5" />
                    Médiathèque
                </Button>
            </div>

            {value && !previewError && (
                <figure className={`relative rounded-lg overflow-hidden border border-border bg-muted ${previewAspectClass}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setPreviewError(true)}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-1.5 right-1.5 h-6 w-6"
                        onClick={() => handleChange("")}
                        aria-label="Retirer le média"
                    >
                        <IconX size={12} />
                    </Button>
                </figure>
            )}

            <MediaPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={(url) => handleChange(url)}
                accept={accept}
                enableCrop={enableCrop}
            />
        </div>
    );
}
