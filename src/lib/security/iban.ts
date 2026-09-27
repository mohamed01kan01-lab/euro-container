import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { normalizeIban } from "@/lib/bank";

/**
 * IBAN des clients (demandes de remboursement) chiffrés en AES-256-GCM.
 * Format stocké : iv.tag.ciphertext, chacun en base64.
 */
function key(): Buffer {
    const hex = process.env.IBAN_ENCRYPTION_KEY;
    if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(
            "IBAN_ENCRYPTION_KEY manquante ou invalide (64 caractères hexadécimaux attendus).",
        );
    }
    return Buffer.from(hex, "hex");
}

export function encryptIban(iban: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const encrypted = Buffer.concat([
        cipher.update(normalizeIban(iban), "utf8"),
        cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
        .map((b) => b.toString("base64"))
        .join(".");
}

export function decryptIban(payload: string): string {
    const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
