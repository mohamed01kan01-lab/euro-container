import type { Metadata } from "next";
import {
    getProductCategories,
    getProductTags,
    getPostCategories,
    getPostTags,
} from "./actions";
import { CategoriesTabs } from "@/components/admin/categories/categories-tabs";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Catégories" };

export default async function CategoriesPage() {
    const [productCategories, productTags, postCategories, postTags] =
        await Promise.all([
            getProductCategories(),
            getProductTags(),
            getPostCategories(),
            getPostTags(),
        ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Catégories & tags"
                description="Organisez vos produits et vos posts. Les catégories acceptent une hiérarchie parent/enfant."
            />

            <CategoriesTabs
                productCategories={productCategories}
                productTags={productTags}
                postCategories={postCategories}
                postTags={postTags}
            />
        </section>
    );
}
