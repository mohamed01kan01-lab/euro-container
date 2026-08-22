"use client";

import { IconPhoto, IconVideo } from "@tabler/icons-react";
import { buildCloudinaryUrl, type MediaItem } from "./media-utils";

interface MediaThumbGridProps {
    media: MediaItem[];
    cloudName: string;
    selectedId: string | null;
    onSelect: (item: MediaItem) => void;
    columnsClass?: string;
}

export function MediaThumbGrid({
    media,
    cloudName,
    selectedId,
    onSelect,
    columnsClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: MediaThumbGridProps) {
    return (
        <ul className={`grid ${columnsClass} gap-3`} role="list">
            {media.map((item) => (
                <li key={item.id}>
                    <article>
                        <button
                            type="button"
                            onClick={() => onSelect(item)}
                            className={`group relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                selectedId === item.id
                                    ? "border-primary shadow-md"
                                    : "border-transparent hover:border-primary/40"
                            }`}
                            aria-label={item.name}
                            aria-pressed={selectedId === item.id}
                        >
                            {cloudName ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={buildCloudinaryUrl(item.publicId, cloudName, item.type, "c_thumb,w_300,h_300")}
                                    alt=""
                                    className="w-full h-full object-cover bg-muted"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    {item.type === "VIDEO"
                                        ? <IconVideo size={32} className="text-muted-foreground" />
                                        : <IconPhoto size={32} className="text-muted-foreground" />
                                    }
                                </div>
                            )}

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs font-medium truncate w-full text-left">
                                    {item.name}
                                </span>
                            </div>

                            {item.type === "VIDEO" && (
                                <div className="absolute top-1.5 left-1.5">
                                    <span className="bg-black/60 text-white text-xs rounded px-1.5 py-0.5 flex items-center gap-1">
                                        <IconVideo size={10} />
                                        vidéo
                                    </span>
                                </div>
                            )}
                        </button>
                    </article>
                </li>
            ))}
        </ul>
    );
}
