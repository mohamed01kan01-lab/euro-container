import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { availablePaymentMethods } from "@/lib/payment";
import { formatPrice } from "@/lib/currency";
import { Separator } from "@/components/ui/separator";
import { CheckoutForm } from "@/components/public/checkout-form";

export const metadata: Metadata = {
    title: "Commande",
    robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
    const cart = await getCart();
    // Un checkout sans panier n'a pas de sens : on renvoie au panier, qui
    // affiche son propre état vide.
    if (cart.lines.length === 0) {
        const locale = await getLocale();
        redirect({ href: "/cart", locale });
    }

    const [settings, session, zones, pickupPoints] = await Promise.all([
        getSiteSettings(),
        auth.api.getSession({ headers: await headers() }),
        prisma.shippingZone.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" },
        }),
        prisma.pickupPoint.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const { currency } = settings;
    const subtotalAfterDiscount = Math.max(0, cart.subtotal - cart.discount);

    if (zones.length === 0 && pickupPoints.length === 0) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-display text-xl">
                    Commande indisponible
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Aucun mode de livraison n&apos;est configuré pour le moment.
                    Revenez plus tard ou contactez-nous.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            <h1 className="mb-8 font-display text-2xl tracking-tight sm:text-3xl">
                Finaliser la commande
            </h1>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
                <CheckoutForm
                    zones={zones.map((z) => ({
                        id: z.id,
                        name: z.name,
                        price: Number(z.price),
                        freeAbove: z.freeAbove === null ? null : Number(z.freeAbove),
                        estimatedDays: z.estimatedDays,
                    }))}
                    pickupPoints={pickupPoints.map((p) => ({
                        id: p.id,
                        name: p.name,
                        address: p.address,
                        details: p.details,
                        hours: p.hours,
                    }))}
                    methods={availablePaymentMethods(settings)}
                    currency={currency}
                    subtotalAfterDiscount={subtotalAfterDiscount}
                    defaults={{
                        name: session?.user.name ?? "",
                        email: session?.user.email ?? "",
                    }}
                    freeShipping={cart.freeShipping}
                />

                <aside className="space-y-4 rounded-[26px] border border-border bg-card p-5 lg:sticky lg:top-24">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                        Votre commande
                    </p>

                    <ul className="space-y-3">
                        {cart.lines.map((line) => (
                            <li
                                key={line.key}
                                className="flex justify-between gap-3 text-sm"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate">
                                        {line.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {line.variantLabel
                                            ? `${line.variantLabel} · `
                                            : ""}
                                        ×{line.quantity}
                                    </span>
                                </span>
                                <span className="whitespace-nowrap">
                                    {formatPrice(line.lineTotal, currency)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <Separator />

                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Sous-total</dt>
                            <dd>{formatPrice(cart.subtotal, currency)}</dd>
                        </div>
                        {cart.discount > 0 && (
                            <div className="flex justify-between text-primary">
                                <dt>Remise ({cart.couponCode})</dt>
                                <dd>−{formatPrice(cart.discount, currency)}</dd>
                            </div>
                        )}
                    </dl>

                    <p className="text-xs text-muted-foreground">
                        Les frais de livraison dépendent du mode choisi et
                        s&apos;ajoutent au total ci-dessus.
                    </p>
                </aside>
            </div>
        </div>
    );
}
