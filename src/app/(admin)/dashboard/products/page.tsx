import type { Metadata } from "next";
import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "../settings/actions";
import { getProducts } from "./actions";
import { ProductsTable } from "@/components/admin/products/products-table";
import { ProductsFilters } from "@/components/admin/products/products-filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Produits" };

const STOCK_FILTERS = ["IN_STOCK", "LOW", "OUT"] as const;
type StockFilter = (typeof STOCK_FILTERS)[number];

interface PageProps {
    searchParams: Promise<{
        status?: string;
        category?: string;
        stock?: string;
    }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const validStatuses: ProductStatus[] = ["DRAFT", "REVIEW", "PUBLISHED"];
    const status = validStatuses.includes(params.status as ProductStatus)
        ? (params.status as ProductStatus)
        : undefined;
    const stock = STOCK_FILTERS.includes(params.stock as StockFilter)
        ? (params.stock as StockFilter)
        : undefined;

    const [products, categories, settings] = await Promise.all([
        getProducts({
            status,
            categoryId: params.category || undefined,
            stock,
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
                title="Produits"
                description={`${products.length} produit${products.length !== 1 ? "s" : ""}`}
                actions={
                    <Button asChild>
                        <Link href="/dashboard/products/new">
                            <IconPlus size={16} className="mr-2" />
                            Nouveau produit
                        </Link>
                    </Button>
                }
            />

            <ProductsFilters categories={categories} />

            <TableCard>
                <ProductsTable
                    products={products}
                    currency={settings.currency}
                />
            </TableCard>
        </section>
    );
}
