"use client";

import { useState } from "react";
import { IconMap, IconMapPin } from "@tabler/icons-react";
import { mapEmbedUrl, mapLinkUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * Carte Google Maps chargée au clic : l'iframe dépose des cookies tiers, qui
 * exigeraient un consentement préalable (RGPD) s'ils étaient chargés d'office.
 */
export function MapEmbed({
    address,
    title,
    className,
}: {
    address: string;
    title: string;
    className?: string;
}) {
    const [loaded, setLoaded] = useState(false);

    if (loaded) {
        return (
            <iframe
                src={mapEmbedUrl(address)}
                title={title}
                loading="lazy"
                className={cn("w-full", className)}
                referrerPolicy="no-referrer-when-downgrade"
            />
        );
    }

    return (
        <div className={cn("flex w-full flex-col items-center justify-center gap-3 bg-muted p-4 text-center", className)}>
            <IconMapPin size={24} className="text-orange-600" />
            <p className="max-w-xs text-sm">{address}</p>
            <div className="flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    onClick={() => setLoaded(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold transition-colors hover:border-foreground/40"
                >
                    <IconMap size={14} /> Afficher la carte
                </button>
                <a
                    href={mapLinkUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                    Ouvrir dans Maps
                </a>
            </div>
            <p className="text-[11px] text-muted-foreground">La carte est fournie par Google, qui peut déposer des cookies.</p>
        </div>
    );
}
