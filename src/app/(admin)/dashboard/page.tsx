import type { Metadata } from "next";
import {
    IconShoppingCart,
    IconCurrencyEuro,
    IconUsers,
    IconFileText,
} from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { getSiteSettings } from "./settings/actions";
import { KpiCard } from "@/components/admin/dashboard/kpi-card";
import { RevenueChart } from "@/components/admin/dashboard/revenue-chart";
import { RecentOrders } from "@/components/admin/dashboard/recent-orders";
import { TopProducts } from "@/components/admin/dashboard/top-products";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOf(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function delta(today: number, yesterday: number): number | null {
    if (yesterday === 0) return today > 0 ? 100 : null;
    return ((today - yesterday) / yesterday) * 100;
}

function last7Days(): { start: Date; end: Date; label: string }[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const start = startOf(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end, label: start.toISOString().split("T")[0] };
    });
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchKpis() {
    const now = new Date();
    const todayStart = startOf(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
        ordersToday,
        ordersYesterday,
        revenueToday,
        revenueYesterday,
        clientsToday,
        clientsYesterday,
        postsPublished,
    ] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, paymentStatus: "PAID" } }),
        prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: yesterdayStart, lt: todayStart }, paymentStatus: "PAID" } }),
        prisma.user.count({ where: { createdAt: { gte: todayStart }, role: "CLIENT" } }),
        prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart }, role: "CLIENT" } }),
        prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);

    const revT = Number(revenueToday._sum.total ?? 0);
    const revY = Number(revenueYesterday._sum.total ?? 0);

    return {
        orders: { value: ordersToday, delta: delta(ordersToday, ordersYesterday) },
        revenue: { value: revT, delta: delta(revT, revY) },
        clients: { value: clientsToday, delta: delta(clientsToday, clientsYesterday) },
        posts: { value: postsPublished, delta: null },
    };
}

async function fetchRevenueChart() {
    const days = last7Days();
    const results = await Promise.all(
        days.map(({ start, end }) =>
            prisma.order.aggregate({
                _sum: { total: true },
                where: { createdAt: { gte: start, lt: end }, paymentStatus: "PAID" },
            })
        )
    );
    return days.map(({ label }, i) => ({
        date: label,
        revenue: Number(results[i]._sum.total ?? 0),
    }));
}

async function fetchRecentOrders() {
    return prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            orderNumber: true,
            customerName: true,
            total: true,
            currency: true,
            paymentStatus: true,
            createdAt: true,
        },
    });
}

async function fetchTopProducts() {
    const items = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
    });

    if (items.length === 0) return [];

    const ids = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, images: true },
    });

    return items.map((item) => {
        const p = products.find((p) => p.id === item.productId);
        return {
            id: item.productId,
            name: p?.name ?? "—",
            image: p?.images[0] ?? null,
            sold: item._sum.quantity ?? 0,
        };
    });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
    const [kpis, chartData, recentOrders, topProducts, settings] = await Promise.all([
        fetchKpis(),
        fetchRevenueChart(),
        fetchRecentOrders(),
        fetchTopProducts(),
        getSiteSettings(),
    ]);

    const currency = settings.currency;

    const formatAmount = (v: number) => formatCurrency(v, currency);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Tableau de bord"
                description="Vue d'ensemble de votre activité aujourd'hui"
            />

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="Commandes du jour"
                    value={kpis.orders.value.toString()}
                    delta={kpis.orders.delta}
                    icon={IconShoppingCart}
                />
                <KpiCard
                    label="Revenus du jour"
                    value={formatAmount(kpis.revenue.value)}
                    delta={kpis.revenue.delta}
                    icon={IconCurrencyEuro}
                />
                <KpiCard
                    label="Nouveaux clients"
                    value={kpis.clients.value.toString()}
                    delta={kpis.clients.delta}
                    icon={IconUsers}
                />
                <KpiCard
                    label="Posts publiés"
                    value={kpis.posts.value.toString()}
                    delta={null}
                    icon={IconFileText}
                />
            </div>

            {/* Chart */}
            <article className="rounded-xl border border-border bg-card p-5">
                <header className="mb-4">
                    <h2 className="text-sm font-semibold">Revenus — 7 derniers jours</h2>
                </header>
                <RevenueChart data={chartData} currency={currency} />
            </article>

            {/* Tables */}
            <div className="grid gap-4 lg:grid-cols-3">
                <article className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                    <header className="mb-4">
                        <h2 className="text-sm font-semibold">Dernières commandes</h2>
                    </header>
                    <RecentOrders
                        orders={recentOrders.map((o) => ({
                            ...o,
                            total: o.total.toString(),
                        }))}
                        currency={currency}
                    />
                </article>

                <article className="rounded-xl border border-border bg-card p-5">
                    <header className="mb-4">
                        <h2 className="text-sm font-semibold">Top 5 produits</h2>
                    </header>
                    <TopProducts products={topProducts} />
                </article>
            </div>
        </section>
    );
}
