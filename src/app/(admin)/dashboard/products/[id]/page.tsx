import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProduct } from "../actions";
import { ProductEditor } from "@/components/admin/products/product-editor";

export const metadata: Metadata = { title: "Modifier le produit" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
    const { id } = await params;

    const [product, categories, tags] = await Promise.all([
        getProduct(id),
        prisma.productCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.productTag.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    if (!product) notFound();

    return (
        <ProductEditor product={product} categories={categories} tags={tags} />
    );
}
