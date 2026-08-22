// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
    id: string;
    publicId: string;
    url: string;
    type: "IMAGE" | "VIDEO";
    name: string;
    size: number | null;
    width: number | null;
    height: number | null;
    format: string | null;
    createdAt: string;
}

export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ─── Cloudinary URL helpers ───────────────────────────────────────────────────

export function buildCloudinaryUrl(
    publicId: string,
    cloudName: string,
    type: "IMAGE" | "VIDEO",
    transform: string,
): string {
    const resourceType = type === "VIDEO" ? "video" : "image";
    const ext = type === "VIDEO" ? ".jpg" : "";
    return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transform}/${publicId}${ext}`;
}

export function buildCropTransform(
    area: CropArea,
    opts: { outputWidth?: number | null; maxWidth?: number | null; maxHeight?: number | null } = {},
): string {
    // Cloudinary rejette (400) les coordonnées hors des bornes de l'image
    let x = Math.max(0, Math.round(area.x));
    let y = Math.max(0, Math.round(area.y));
    let w = Math.max(1, Math.round(area.width));
    let h = Math.max(1, Math.round(area.height));

    if (opts.maxWidth) {
        x = Math.min(x, opts.maxWidth - 1);
        w = Math.min(w, opts.maxWidth - x);
    }
    if (opts.maxHeight) {
        y = Math.min(y, opts.maxHeight - 1);
        h = Math.min(h, opts.maxHeight - y);
    }

    let t = `c_crop,x_${x},y_${y},w_${w},h_${h}`;
    if (opts.outputWidth) t += `/c_limit,w_${opts.outputWidth}`;
    return `${t}/q_auto,f_auto`;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
