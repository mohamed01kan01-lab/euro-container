"use client";

import { useState, useTransition, type ReactNode } from "react";
import { IconDownload, IconEye, IconLoader2 } from "@tabler/icons-react";
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
import { getProofUrls } from "@/app/(admin)/dashboard/orders/actions";

interface Preview {
    url: string;
    downloadUrl: string;
    isPdf: boolean;
}

/**
 * Bouton « Voir » d'un justificatif de virement et sa fenêtre d'aperçu. Les URL
 * signées Cloudinary sont générées au clic (elles expirent) : utilisé dans la
 * liste des commandes et dans la fiche commande.
 */
export function ProofPreviewButton({
    proofId,
    name,
    description,
    label = "Voir",
    actions,
}: {
    proofId: string;
    name: string;
    description: string;
    label?: string;
    /** Boutons ajoutés au pied de la fenêtre ; reçoit de quoi la fermer. */
    actions?: (close: () => void) => ReactNode;
}) {
    const [pending, startTransition] = useTransition();
    const [preview, setPreview] = useState<Preview | null>(null);
    const close = () => setPreview(null);

    function open() {
        startTransition(async () => {
            const res = await getProofUrls(proofId);
            if (res.ok) setPreview({ url: res.previewUrl, downloadUrl: res.downloadUrl, isPdf: res.isPdf });
            else toast.error(res.error);
        });
    }

    return (
        <>
            <Button size="sm" variant="outline" disabled={pending} onClick={open}>
                {pending ? (
                    <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                ) : (
                    <IconEye size={15} className="mr-1.5" />
                )}
                {label}
            </Button>

            <Dialog open={preview !== null} onOpenChange={(o) => !o && close()}>
                <DialogContent className="rounded-3xl sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">{name}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    {preview && (
                        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                            {preview.isPdf ? (
                                <iframe src={preview.url} title={name} className="h-[70dvh] w-full" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview.url} alt={name} className="max-h-[70dvh] w-full object-contain" />
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {preview && (
                            <Button variant="outline" className="rounded-full" asChild>
                                <a href={preview.downloadUrl} target="_blank" rel="noreferrer">
                                    <IconDownload size={15} className="mr-1.5" /> Télécharger
                                </a>
                            </Button>
                        )}
                        {actions?.(close)}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
