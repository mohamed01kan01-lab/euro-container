import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { IconShoppingCartOff, IconArrowRight } from "@tabler/icons-react";
import { getCart } from "@/lib/cart";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/public/button";
import { Separator } from "@/components/ui/separator";
import { CartLines } from "@/components/public/cart-lines";
import { CouponField } from "@/components/public/coupon-field";

export const metadata: Metadata = {
    title: "Panier",
    robots: { index: false, follow: true },
};

export default async function CartPage() {
    const [cart, settings] = await Promise.all([getCart(), getSiteSettings()]);
    const { currency } = settings;

    if (cart.lines.length === 0) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <IconShoppingCartOff
                        size={28}
                        className="text-muted-foreground"
                    />
                </span>
                <div className="space-y-1">
                    <h1 className="font-display text-xl">
                        Votre panier est vide
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Parcourez la boutique pour y ajouter des articles.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/shop">Voir la boutique</Link>
                </Button>
            </div>
        );
    }

    const total = Math.max(0, cart.subtotal - cart.discount);

    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            <h1 className="mb-8 font-display text-2xl tracking-tight sm:text-3xl">
                Votre panier
            </h1>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="rounded-[26px] border border-border bg-card p-4 sm:p-5">
                    <CartLines lines={cart.lines} currency={currency} />
                </div>

                <aside className="space-y-4 rounded-[26px] border border-border bg-card p-5 lg:sticky lg:top-24">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                        Récapitulatif
                    </p>

                    <CouponField
                        appliedCode={cart.couponCode}
                        error={cart.couponError}
                    />

                    <Separator />

                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">
                                Sous-total ({cart.itemCount} article
                                {cart.itemCount > 1 ? "s" : ""})
                            </dt>
                            <dd>{formatPrice(cart.subtotal, currency)}</dd>
                        </div>

                        {cart.discount > 0 && (
                            <div className="flex justify-between text-primary">
                                <dt>Remise</dt>
                                <dd>−{formatPrice(cart.discount, currency)}</dd>
                            </div>
                        )}

                        {cart.freeShipping && (
                            <div className="flex justify-between text-primary">
                                <dt>Livraison</dt>
                                <dd>Offerte</dd>
                            </div>
                        )}

                        <div className="flex justify-between text-muted-foreground">
                            <dt>Livraison</dt>
                            <dd className="text-xs">
                                Calculée à l&apos;étape suivante
                            </dd>
                        </div>
                    </dl>

                    <Separator />

                    <div className="flex items-baseline justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="font-display text-2xl text-orange-600">
                            {formatPrice(total, currency)}
                        </span>
                    </div>

                    <Button size="lg" variant="accent" className="w-full" asChild>
                        <Link href="/checkout">
                            Passer commande
                            <IconArrowRight size={17} className="ml-2" />
                        </Link>
                    </Button>

                    <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href="/shop">Continuer mes achats</Link>
                    </Button>
                </aside>
            </div>
        </div>
    );
}
