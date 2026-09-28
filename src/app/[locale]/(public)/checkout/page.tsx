import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { IconMail, IconPhone } from "@tabler/icons-react";
import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { availablePaymentMethods } from "@/lib/payment";
import { CheckoutForm } from "@/components/public/checkout-form";

export const metadata: Metadata = {
    title: "Commande",
    robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
    const [cart, locale] = await Promise.all([getCart(), getLocale()]);
    // Un checkout sans panier n'a pas de sens : on renvoie au panier, qui
    // affiche son propre état vide.
    if (cart.lines.length === 0) {
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

    const methods = availablePaymentMethods(settings);

    // Client connecté : on reprend les coordonnées de sa dernière commande pour
    // qu'il n'ait plus rien à ressaisir.
    const lastOrder = session
        ? await prisma.order.findFirst({
              where: { userId: session.user.id },
              orderBy: { createdAt: "desc" },
              select: { customerPhone: true, shippingAddress: true },
          })
        : null;
    const lastAddress =
        lastOrder?.shippingAddress && typeof lastOrder.shippingAddress === "object" && !Array.isArray(lastOrder.shippingAddress)
            ? (lastOrder.shippingAddress as Record<string, string | undefined>)
            : {};

    if ((zones.length === 0 && pickupPoints.length === 0) || methods.length === 0) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-display text-2xl">Finalisons ensemble votre commande</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    La commande en ligne est momentanément indisponible. Un
                    conseiller finalise votre achat avec vous en quelques minutes.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2 text-sm">
                    {settings.phone && (
                        <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-2 font-semibold">
                            <IconPhone size={16} /> {settings.phone}
                        </a>
                    )}
                    {settings.contactEmail && (
                        <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-2">
                            <IconMail size={16} /> {settings.contactEmail}
                        </a>
                    )}
                    <Link href="/contact" className="mt-2 underline underline-offset-4">
                        Nous écrire
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:pt-12 lg:pb-16">
            <h1 className="mb-8 font-display text-3xl tracking-tight sm:text-4xl">
                Finaliser la commande
            </h1>

            <CheckoutForm
                locale={locale}
                lines={cart.lines.map((l) => ({
                    key: l.key,
                    name: l.name,
                    variantLabel: l.variantLabel,
                    image: l.image,
                    quantity: l.quantity,
                    lineTotal: l.lineTotal,
                }))}
                subtotal={cart.subtotal}
                discount={cart.discount}
                couponCode={cart.couponCode}
                freeShipping={cart.freeShipping}
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
                methods={methods}
                currency={settings.currency}
                vatRate={settings.vatRate}
                paymentDueDays={settings.paymentDueDays}
                supportPhone={settings.phone}
                defaults={{
                    name: session?.user.name ?? "",
                    email: session?.user.email ?? "",
                    phone: lastOrder?.customerPhone ?? "",
                    company: lastAddress.company ?? "",
                    vatNumber: lastAddress.vatNumber ?? "",
                    // Un retrait n'a pas d'adresse client : on ne reprend que les livraisons.
                    addressLine1: lastAddress.zone ? (lastAddress.line1 ?? "") : "",
                    addressLine2: lastAddress.zone ? (lastAddress.line2 ?? "") : "",
                    city: lastAddress.city ?? "",
                    postalCode: lastAddress.postalCode ?? "",
                    country: lastAddress.country ?? "France",
                }}
            />
        </div>
    );
}
