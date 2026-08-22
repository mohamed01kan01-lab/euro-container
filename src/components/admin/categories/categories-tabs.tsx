"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriesPanel } from "./categories-panel";
import { TagsPanel } from "./tags-panel";
import {
    createProductCategory,
    updateProductCategory,
    deleteProductCategory,
    createPostCategory,
    updatePostCategory,
    deletePostCategory,
    createProductTag,
    updateProductTag,
    deleteProductTag,
    createPostTag,
    updatePostTag,
    deletePostTag,
    type SerializedCategory,
    type SerializedTag,
} from "@/app/(admin)/dashboard/categories/actions";

interface CategoriesTabsProps {
    productCategories: SerializedCategory[];
    productTags: SerializedTag[];
    postCategories: SerializedCategory[];
    postTags: SerializedTag[];
}

export function CategoriesTabs({
    productCategories,
    productTags,
    postCategories,
    postTags,
}: CategoriesTabsProps) {
    return (
        <Tabs defaultValue="product-categories">
            <TabsList className="mb-6 flex-wrap h-auto">
                <TabsTrigger value="product-categories">
                    Catégories produits
                </TabsTrigger>
                <TabsTrigger value="product-tags">Tags produits</TabsTrigger>
                <TabsTrigger value="post-categories">
                    Catégories posts
                </TabsTrigger>
                <TabsTrigger value="post-tags">Tags posts</TabsTrigger>
            </TabsList>

            <TabsContent value="product-categories">
                <CategoriesPanel
                    categories={productCategories}
                    countLabel="Produits"
                    onCreate={createProductCategory}
                    onUpdate={updateProductCategory}
                    onDelete={deleteProductCategory}
                />
            </TabsContent>

            <TabsContent value="product-tags">
                <TagsPanel
                    tags={productTags}
                    countLabel="Produits"
                    onCreate={createProductTag}
                    onUpdate={updateProductTag}
                    onDelete={deleteProductTag}
                />
            </TabsContent>

            <TabsContent value="post-categories">
                <CategoriesPanel
                    categories={postCategories}
                    countLabel="Posts"
                    onCreate={createPostCategory}
                    onUpdate={updatePostCategory}
                    onDelete={deletePostCategory}
                />
            </TabsContent>

            <TabsContent value="post-tags">
                <TagsPanel
                    tags={postTags}
                    countLabel="Posts"
                    onCreate={createPostTag}
                    onUpdate={updatePostTag}
                    onDelete={deletePostTag}
                />
            </TabsContent>
        </Tabs>
    );
}
