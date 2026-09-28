import { NextResponse } from "next/server";
import { runPaymentReminders } from "@/lib/payment-reminders";

/**
 * Cron Vercel (voir vercel.json). Vercel appelle cette route en GET avec
 * l'en-tête `Authorization: Bearer <CRON_SECRET>` quand la variable
 * d'environnement CRON_SECRET est définie sur le projet.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const report = await runPaymentReminders();
    console.info("[cron] relances de paiement :", report);
    return NextResponse.json(report);
}
