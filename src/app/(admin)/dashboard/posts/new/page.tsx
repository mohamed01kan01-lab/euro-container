import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PostEditor } from "@/components/admin/posts/post-editor";

export const metadata: Metadata = { title: "Nouveau post" };

export default async function NewPostPage() {
    const [categories, tags] = await Promise.all([
        prisma.postCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.postTag.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    return <PostEditor categories={categories} tags={tags} />;
}
