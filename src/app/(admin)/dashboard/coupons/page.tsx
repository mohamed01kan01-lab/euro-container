import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "../settings/actions";
import { getCoupons } from "./actions";
import { CouponsTable } from "@/components/admin/coupons/coupons-table";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
    const [coupons, products, categories, settings] = await Promise.all([
        getCoupons(),
        prisma.product.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
            take: 200,
        }),
        prisma.productCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        getSiteSettings(),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Coupons"
                description="Codes promo, conditions d'application et fenêtres de validité."
            />

            <CouponsTable
                coupons={coupons}
                products={products}
                categories={categories}
                currency={settings.currency}
            />
        </section>
    );
}
