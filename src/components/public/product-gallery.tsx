"use client";

import { useState } from "react";

interface ProductGalleryProps {
    images: string[];
    alt: string;
}

/**
 * Seule partie interactive de la page produit : le reste est rendu côté serveur.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
    const [active, setActive] = useState(0);

    if (images.length === 0) {
        return (
            <div className="aspect-square rounded-xl border border-border bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
        );
    }

    return (
        <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    key={images[active]}
                    src={images[active]}
                    alt={alt}
                    className="h-full w-full object-cover duration-500 animate-in fade-in"
                />
            </div>

            {images.length > 1 && (
                <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {images.map((url, index) => (
                        <li key={`${url}-${index}`}>
                            <button
                                type="button"
                                onClick={() => setActive(index)}
                                aria-label={`Voir l'image ${index + 1} sur ${images.length}`}
                                aria-current={index === active}
                                className={
                                    index === active
                                        ? "aspect-square w-full overflow-hidden rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all"
                                        : "aspect-square w-full overflow-hidden rounded-lg border border-border opacity-70 transition-all hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                }
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
