import type { Metadata } from "next";
import Link from "next/link";
import type { PostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getPosts } from "./actions";
import { PostsTable } from "@/components/admin/posts/posts-table";
import { PostsFilters } from "@/components/admin/posts/posts-filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Posts" };

interface PageProps {
    searchParams: Promise<{
        status?: string;
        author?: string;
        category?: string;
    }>;
}

export default async function PostsPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const validStatuses: PostStatus[] = ["DRAFT", "REVIEW", "PUBLISHED"];
    const status = validStatuses.includes(params.status as PostStatus)
        ? (params.status as PostStatus)
        : undefined;

    const [posts, categories, authors] = await Promise.all([
        getPosts({
            status,
            authorId: params.author || undefined,
            categoryId: params.category || undefined,
        }),
        prisma.postCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
            where: { role: { in: ["ADMIN", "EDITOR"] } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Posts"
                description={`${posts.length} post${posts.length !== 1 ? "s" : ""}`}
                actions={
                    <Button asChild>
                        <Link href="/dashboard/posts/new">
                            <IconPlus size={16} className="mr-2" />
                            Nouveau post
                        </Link>
                    </Button>
                }
            />

            <PostsFilters categories={categories} authors={authors} />

            <TableCard>
                <PostsTable posts={posts} />
            </TableCard>
        </section>
    );
}
