/**
 * Type réel d'un fichier d'après ses premiers octets : l'extension et le
 * Content-Type envoyés par le navigateur ne prouvent rien.
 */
export type ProofFileType = "pdf" | "jpg" | "png" | "webp";

export function detectProofType(bytes: Uint8Array): ProofFileType | null {
    const starts = (sig: number[], offset = 0) =>
        sig.every((b, i) => bytes[offset + i] === b);

    if (starts([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
    if (starts([0xff, 0xd8, 0xff])) return "jpg";
    if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
    if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
        return "webp"; // RIFF....WEBP
    }
    return null;
}
