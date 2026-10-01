"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { IconCloudUpload, IconFileCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX = 5 * 1024 * 1024;

/**
 * Glisser-déposer ou sélection du justificatif. L'envoi part dès le choix du
 * fichier (pas de bouton « Envoyer » supplémentaire) ; XHR plutôt que fetch
 * pour afficher la progression sur une connexion mobile lente.
 */
export function ProofDropzone({
    orderNumber,
    compact,
}: {
    orderNumber: string;
    compact?: boolean;
}) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [sentName, setSentName] = useState<string | null>(null);

    function upload(file: File) {
        if (file.size > MAX) {
            toast.error("Fichier trop volumineux (5 Mo maximum).");
            return;
        }
        const body = new FormData();
        body.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/orders/${encodeURIComponent(orderNumber)}/proof`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            setProgress(null);
            let res: { ok?: boolean; error?: string } = {};
            try {
                res = JSON.parse(xhr.responseText);
            } catch {}
            if (xhr.status >= 200 && xhr.status < 300 && res.ok) {
                setSentName(file.name);
                toast.success("Justificatif reçu, merci !");
                router.refresh();
            } else {
                toast.error(res.error ?? "L'envoi a échoué. Réessayez.");
            }
        };
        xhr.onerror = () => {
            setProgress(null);
            toast.error("Connexion interrompue. Réessayez.");
        };
        setProgress(0);
        xhr.send(body);
    }

    function onFiles(files: FileList | null) {
        const file = files?.[0];
        if (file) upload(file);
        if (input.current) input.current.value = "";
    }

    const uploading = progress !== null;

    return (
        <div>
            <button
                type="button"
                disabled={uploading}
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    onFiles(e.dataTransfer.files);
                }}
                className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 border-dashed text-left transition-colors",
                    compact ? "p-3" : "p-4",
                    dragging ? "border-orange-600 bg-orange-600/5" : "border-border hover:border-foreground/30",
                )}
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {uploading ? (
                        <IconLoader2 size={18} className="animate-spin" />
                    ) : sentName ? (
                        <IconFileCheck size={18} className="text-green-600" />
                    ) : (
                        <IconCloudUpload size={18} />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                        {uploading
                            ? "Envoi en cours…"
                            : sentName
                              ? `${sentName} envoyé`
                              : compact
                                ? "Ajouter un justificatif"
                                : "Envoyer la preuve de virement"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        {sentName
                            ? "Vous pouvez en ajouter un autre si besoin."
                            : compact
                              ? "Capture ou PDF de votre banque, 5 Mo max."
                              : "Une fois le virement fait, envoyez la capture ou le PDF de votre banque (5 Mo max). C'est ce document qui nous signale votre paiement."}
                    </span>
                </span>
            </button>
            {uploading && <Progress value={progress} className="mt-2 h-1.5" />}
            <input
                ref={input}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
            />
        </div>
    );
}
