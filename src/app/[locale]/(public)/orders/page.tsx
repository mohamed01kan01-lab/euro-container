import type { Metadata } from "next";
import { headers } from "next/headers";
import { IconPackage } from "@tabler/icons-react";
import NextLink from "next/link";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/customer-orders";
import { CustomerOrdersList } from "@/components/public/order/customer-orders-list";
import { OrderLookupForm } from "@/components/public/order/order-lookup-form";

export const metadata: Metadata = {
    title: "Mes commandes",
    robots: { index: false, follow: false },
};

export default async function MyOrdersPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const orders = session ? await getCustomerOrders(session.user) : [];

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Mes commandes</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Suivez vos commandes, finalisez un paiement ou envoyez votre justificatif de virement.
            </p>

            {session && (
                <section className="mt-8">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-[26px] border border-border bg-card px-6 py-12 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <IconPackage size={22} className="text-muted-foreground" />
                            </span>
                            <p className="font-medium">Aucune commande pour {session.user.email}</p>
                            <Link href="/shop" className="text-sm font-semibold text-orange-600 underline-offset-4 hover:underline">
                                Découvrir nos conteneurs
                            </Link>
                        </div>
                    ) : (
                        <CustomerOrdersList orders={orders} />
                    )}
                </section>
            )}

            <section className="mt-8 rounded-[26px] border border-border bg-card p-5 sm:p-6">
                <h2 className="font-semibold">
                    {session ? "Une commande passée avec un autre email ?" : "Retrouver une commande"}
                </h2>
                <p className="mb-5 mt-1 text-sm text-muted-foreground">
                    Le numéro figure dans l&apos;email de confirmation (format EC-XXXXXXXX).
                </p>
                <OrderLookupForm />
                {!session && (
                    <p className="mt-4 text-xs text-muted-foreground">
                        Vous avez un compte ?{" "}
                        <NextLink href="/login?callbackUrl=/account" className="font-semibold text-foreground underline underline-offset-4">
                            Connectez-vous
                        </NextLink>{" "}
                        pour voir toutes vos commandes.
                    </p>
                )}
            </section>
        </div>
    );
}
