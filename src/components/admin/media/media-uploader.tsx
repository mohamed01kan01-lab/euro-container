"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCloudUpload } from "@tabler/icons-react";
import { toast } from "sonner";
import { uploadMedia } from "@/app/(admin)/dashboard/media/actions";

const MAX_SIZE = 20 * 1024 * 1024;

interface MediaUploaderProps {
    onUploaded?: () => void;
    compact?: boolean;
}

export function MediaUploader({ onUploaded, compact = false }: MediaUploaderProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;

        const valid = Array.from(files).filter((f) => {
            if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
                toast.error(`${f.name} : type non supporté`);
                return false;
            }
            if (f.size > MAX_SIZE) {
                toast.error(`${f.name} : fichier trop volumineux (max 20MB)`);
                return false;
            }
            return true;
        });

        if (valid.length === 0) return;

        setUploading(true);
        for (const file of valid) {
            const formData = new FormData();
            formData.set("file", file);
            await toast.promise(uploadMedia(formData), {
                loading: `Upload de ${file.name}…`,
                success: `${file.name} importé`,
                error: (e: Error) => e.message ?? `Erreur pour ${file.name}`,
            });
        }
        setUploading(false);
        router.refresh();
        onUploaded?.();
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }

    return (
        <div
            className={`border-2 border-dashed rounded-xl ${compact ? "p-5" : "p-8"} text-center transition-colors ${
                isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <input
                ref={inputRef}
                type="file"
                className="sr-only"
                multiple
                accept="image/*,video/*"
                disabled={uploading}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
            <figure className="flex flex-col items-center gap-3">
                <IconCloudUpload size={36} className="text-muted-foreground" aria-hidden />
                <figcaption className="space-y-1">
                    <p className="text-sm font-medium">
                        Glissez vos fichiers ici ou{" "}
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="text-primary hover:underline disabled:opacity-50"
                            disabled={uploading}
                        >
                            parcourir
                        </button>
                    </p>
                    <p className="text-xs text-muted-foreground">Images et vidéos · max 20MB</p>
                </figcaption>
            </figure>
        </div>
    );
}
