import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { detectProofType } from "@/lib/security/file-signature";
import { PROOF_MAX_BYTES, uploadPaymentProof } from "@/lib/payment-proofs";
import { defer } from "@/lib/order-payment";
import { notifyAdmin, sendTransferDeclaredEmail } from "@/lib/order-emails";

/**
 * Justificatif de virement. Route Handler plutôt que Server Action : les Server
 * Actions sont limitées à 1 Mo par défaut, un scan PDF dépasse vite.
 *
 * Envoyer un justificatif vaut signalement du virement : une commande en
 * attente passe en vérification, sans second clic.
 */
const MAX_PROOFS_PER_ORDER = 10;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(
    request: Request,
    { params }: { params: Promise<{ orderNumber: string }> },
) {
    const { orderNumber } = await params;

    const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: {
            id: true,
            paymentStatus: true,
            paymentMethod: true,
            _count: { select: { paymentProofs: true } },
        },
    });
    if (!order) return fail("Commande introuvable.", 404);
    if (!["PENDING", "FAILED", "VERIFYING"].includes(order.paymentStatus)) {
        return fail("Cette commande n'attend plus de justificatif.", 409);
    }
    if (order._count.paymentProofs >= MAX_PROOFS_PER_ORDER) {
        return fail("Nombre maximal de justificatifs atteint. Contactez-nous.", 429);
    }

    let value: FormDataEntryValue | null = null;
    try {
        value = (await request.formData()).get("file");
    } catch {
        return fail("Envoi invalide.");
    }
    if (!(value instanceof File) || value.size === 0) return fail("Aucun fichier reçu.");
    const file = value;
    if (file.size > PROOF_MAX_BYTES) return fail("Fichier trop volumineux (5 Mo maximum).");

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectProofType(buffer);
    if (!type) return fail("Format non accepté : PDF, JPG, PNG ou WEBP uniquement.");

    const uploaded = await uploadPaymentProof(buffer, orderNumber, type).catch((err) => {
        console.error("[proof] upload :", err);
        return null;
    });
    if (!uploaded) return fail("L'envoi a échoué. Réessayez dans un instant.", 502);

    const declared = await prisma.$transaction(async (tx) => {
        await tx.paymentProof.create({
            data: {
                orderId: order.id,
                publicId: uploaded.public_id,
                resourceType: uploaded.resource_type,
                format: uploaded.format ?? type,
                bytes: uploaded.bytes ?? buffer.length,
                originalName: file.name.slice(0, 200),
            },
        });
        const res = await tx.order.updateMany({
            where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] } },
            data: { paymentStatus: "VERIFYING", paymentMethod: "BANK_TRANSFER" },
        });
        return res.count === 1;
    });

    if (declared) {
        defer("email virement signalé", () => sendTransferDeclaredEmail(order.id));
    }
    defer("notif admin justificatif", () => notifyAdmin(order.id, "TRANSFER_DECLARED"));

    revalidatePath(`/order/${orderNumber}`);
    revalidatePath("/dashboard/orders");
    return NextResponse.json({ ok: true });
}
