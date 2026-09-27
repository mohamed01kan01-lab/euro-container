import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import type { ProofFileType } from "@/lib/security/file-signature";

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

async function configure() {
    const s = await getSiteSettings();
    if (!s.cloudinaryCloudName || !s.cloudinaryApiKey || !s.cloudinaryApiSecret) {
        throw new Error("Le stockage des justificatifs n'est pas configuré.");
    }
    cloudinary.config({
        cloud_name: s.cloudinaryCloudName,
        api_key: s.cloudinaryApiKey,
        api_secret: s.cloudinaryApiSecret,
        secure: true,
    });
}

/**
 * Upload en type "authenticated" : le fichier n'a pas d'URL publique, il n'est
 * lisible qu'au travers d'une URL signée générée pour un administrateur.
 */
export async function uploadPaymentProof(
    buffer: Buffer,
    orderNumber: string,
    type: ProofFileType,
): Promise<UploadApiResponse> {
    await configure();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `euro-container/payment-proofs/${orderNumber}`,
                type: "authenticated",
                resource_type: "image", // Cloudinary traite aussi les PDF en "image"
                format: type === "jpg" ? "jpg" : type,
            },
            (error, result) => {
                if (error || !result) reject(error ?? new Error("Upload échoué"));
                else resolve(result);
            },
        );
        stream.end(buffer);
    });
}

/** URL de téléchargement signée, valable 10 minutes. */
export async function signedProofUrl(publicId: string, format: string | null) {
    await configure();
    return cloudinary.utils.private_download_url(publicId, format ?? "", {
        type: "authenticated",
        resource_type: "image",
        expires_at: Math.floor(Date.now() / 1000) + 600,
    });
}
