import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPost } from "@/app/(admin)/dashboard/posts/actions";
import { PostEditor } from "@/components/admin/posts/post-editor";
import type { SerializedPost } from "@/components/admin/posts/post-editor";

export const metadata: Metadata = { title: "Modifier le post" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
    const { id } = await params;

    const [post, categories, tags] = await Promise.all([
        getPost(id),
        prisma.postCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.postTag.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    if (!post) notFound();

    const serialized: SerializedPost = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featuredImage,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        status: post.status,
        categoryIds: post.categories.map((c) => c.categoryId),
        tagIds: post.tags.map((t) => t.tagId),
    };

    return <PostEditor post={serialized} categories={categories} tags={tags} />;
}
