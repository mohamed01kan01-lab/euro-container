import { NextResponse } from "next/server";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getStripe } from "@/lib/stripe";
import { syncStripeSession } from "@/lib/order-payment";

/**
 * Webhook Stripe : à déclarer dans le dashboard Stripe sur
 * {NEXT_PUBLIC_APP_URL}/api/stripe/webhook avec les événements
 * checkout.session.completed et checkout.session.async_payment_succeeded.
 *
 * Le retour du client sur la page commande confirme déjà le paiement ; le
 * webhook couvre le cas où le client ferme l'onglet avant ce retour.
 */
export async function POST(request: Request) {
    const settings = await getSiteSettings();
    const secret = settings.stripeWebhookSecret?.trim();
    if (!secret) {
        return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
    }

    const body = await request.text();
    let event;
    try {
        event = await getStripe(settings).webhooks.constructEventAsync(body, signature, secret);
    } catch (err) {
        console.error("[stripe] signature invalide :", err);
        return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
    }

    if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
    ) {
        try {
            // On relit la session plutôt que de faire confiance au contenu de l'événement.
            await syncStripeSession(event.data.object.id);
        } catch (err) {
            console.error("[stripe] synchronisation :", err);
            // 500 : Stripe réessaiera plus tard.
            return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
