import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductEditor } from "@/components/admin/products/product-editor";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
    const [categories, tags] = await Promise.all([
        prisma.productCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.productTag.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    return <ProductEditor categories={categories} tags={tags} />;
}
