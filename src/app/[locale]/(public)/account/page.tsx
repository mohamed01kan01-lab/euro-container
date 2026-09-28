import type { Metadata } from "next";
import { headers } from "next/headers";
import {
    IconAlertCircle,
    IconArrowRight,
    IconHeadset,
    IconLayoutDashboard,
    IconPackage,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import NextLink from "next/link";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getCustomerOrders } from "@/lib/customer-orders";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/public/button";
import { CustomerOrdersList } from "@/components/public/order/customer-orders-list";
import { AccountSettings } from "@/components/public/account/account-settings";

export const metadata: Metadata = {
    title: "Mon compte",
    robots: { index: false, follow: false },
};

export default async function AccountPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        // Le proxy redirige déjà ; filet de sécurité si le cookie est expiré.
        redirect("/login?callbackUrl=/account");
    }

    const [orders, settings] = await Promise.all([getCustomerOrders(session.user), getSiteSettings()]);
    const role = (session.user as { role?: string }).role;
    const isStaff = role === "ADMIN" || role === "EDITOR";
    const toPay = orders.filter((o) => o.paymentStatus === "PENDING" || o.paymentStatus === "FAILED");
    const firstName = session.user.name.split(" ")[0];

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Mon compte</p>
                    <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Bonjour {firstName}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{session.user.email}</p>
                </div>
                {isStaff && (
                    <Button asChild variant="outline" size="sm">
                        <NextLink href="/dashboard">
                            <IconLayoutDashboard /> Dashboard
                        </NextLink>
                    </Button>
                )}
            </header>

            {/* ─── Paiements en attente : l'action la plus utile en premier ── */}
            {toPay.length > 0 && (
                <section className="mt-8 space-y-3">
                    {toPay.map((o) => (
                        <div
                            key={o.orderNumber}
                            className="flex flex-col gap-4 rounded-[26px] border border-orange-600/40 bg-orange-600/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <IconAlertCircle size={22} className="mt-0.5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-semibold">
                                        Commande <span className="font-mono">{o.orderNumber}</span> en attente de paiement
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatPrice(o.total, o.currency)} TTC · réglez-la pour confirmer votre réservation.
                                    </p>
                                </div>
                            </div>
                            <Button asChild variant="accent" size="sm" className="shrink-0">
                                <Link href={`/order/${o.orderNumber}`}>
                                    Payer maintenant <IconArrowRight />
                                </Link>
                            </Button>
                        </div>
                    ))}
                </section>
            )}

            {/* ─── Commandes ──────────────────────────────────────────────── */}
            <section className="mt-10">
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
                    <IconPackage size={20} className="text-orange-600" /> Mes commandes
                </h2>
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-[26px] border border-border bg-card px-6 py-12 text-center">
                        <p className="font-medium">Vous n&apos;avez pas encore passé de commande.</p>
                        <Button asChild variant="accent" size="sm">
                            <Link href="/shop">Découvrir nos conteneurs</Link>
                        </Button>
                    </div>
                ) : (
                    <CustomerOrdersList orders={orders} />
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                    Une commande passée avec un autre email ?{" "}
                    <Link href="/orders" className="font-semibold text-foreground underline underline-offset-4">
                        Retrouvez-la ici
                    </Link>
                    .
                </p>
            </section>

            {/* ─── Profil ─────────────────────────────────────────────────── */}
            <section className="mt-10">
                <h2 className="mb-4 font-display text-xl">Mon profil</h2>
                <AccountSettings name={session.user.name} email={session.user.email} canDelete={!isStaff} />
            </section>

            {(settings.phone || settings.contactEmail) && (
                <p className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                    <IconHeadset size={16} /> Besoin d&apos;aide ?
                    {settings.phone && (
                        <a href={`tel:${settings.phone}`} className="font-semibold text-foreground">
                            {settings.phone}
                        </a>
                    )}
                    {settings.contactEmail && (
                        <a href={`mailto:${settings.contactEmail}`} className="font-semibold text-foreground">
                            {settings.contactEmail}
                        </a>
                    )}
                </p>
            )}
        </div>
    );
}
