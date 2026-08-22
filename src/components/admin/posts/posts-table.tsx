"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    IconDotsVertical,
    IconEdit,
    IconTrash,
    IconEye,
    IconClockHour4,
    IconCircleCheck,
    IconFileText,
    IconLoader2,
} from "@tabler/icons-react";
import type { PostStatus } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deletePost, updatePostStatus } from "@/app/(admin)/dashboard/posts/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
    id: string;
    title: string;
    slug: string;
    status: PostStatus;
    updatedAt: Date;
    author: { name: string };
    categories: { category: { id: string; name: string } }[];
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PostStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    DRAFT: { label: "Brouillon", icon: <IconFileText size={12} />, variant: "secondary" },
    REVIEW: { label: "En révision", icon: <IconClockHour4 size={12} />, variant: "outline" },
    PUBLISHED: { label: "Publié", icon: <IconCircleCheck size={12} />, variant: "default" },
};

const NEXT_STATUS: Record<PostStatus, { status: PostStatus; label: string }[]> = {
    DRAFT: [{ status: "REVIEW", label: "Soumettre en révision" }],
    REVIEW: [
        { status: "PUBLISHED", label: "Publier" },
        { status: "DRAFT", label: "Remettre en brouillon" },
    ],
    PUBLISHED: [{ status: "DRAFT", label: "Dépublier" }],
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PostsTableProps {
    posts: Post[];
}

export function PostsTable({ posts }: PostsTableProps) {
    const [pending, startTransition] = useTransition();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    function handleStatusChange(id: string, status: PostStatus) {
        startTransition(async () => {
            try {
                await updatePostStatus(id, status);
                toast.success("Statut mis à jour");
            } catch {
                toast.error("Erreur lors de la mise à jour");
            }
        });
    }

    function handleDelete() {
        if (!deleteId) return;
        startTransition(async () => {
            try {
                await deletePost(deleteId);
                toast.success("Post supprimé");
            } catch {
                toast.error("Erreur lors de la suppression");
            } finally {
                setDeleteId(null);
            }
        });
    }

    if (posts.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-12 text-center">
                Aucun post. <Link href="/dashboard/posts/new" className="text-primary hover:underline">Créer le premier.</Link>
            </p>
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Catégories</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead>Modifié</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {posts.map((post) => {
                        const cfg = STATUS_CONFIG[post.status];
                        const nextStatuses = NEXT_STATUS[post.status];
                        return (
                            <TableRow key={post.id}>
                                <TableCell className="font-medium max-w-xs truncate">
                                    <Link
                                        href={`/dashboard/posts/${post.id}`}
                                        className="hover:text-primary transition-colors"
                                    >
                                        {post.title}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {post.categories.length === 0 ? (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        ) : (
                                            post.categories.slice(0, 2).map(({ category }) => (
                                                <Badge key={category.id} variant="outline" className="text-xs">
                                                    {category.name}
                                                </Badge>
                                            ))
                                        )}
                                        {post.categories.length > 2 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{post.categories.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={cfg.variant} className="gap-1">
                                        {cfg.icon}
                                        {cfg.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {post.author.name}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Intl.DateTimeFormat("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    }).format(post.updatedAt)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <IconDotsVertical size={15} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/posts/${post.id}`}>
                                                    <IconEdit size={14} className="mr-2" />
                                                    Modifier
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/blog/${post.slug}`} target="_blank">
                                                    <IconEye size={14} className="mr-2" />
                                                    Voir
                                                </Link>
                                            </DropdownMenuItem>
                                            {nextStatuses.length > 0 && <DropdownMenuSeparator />}
                                            {nextStatuses.map(({ status, label }) => (
                                                <DropdownMenuItem
                                                    key={status}
                                                    disabled={pending}
                                                    onSelect={() => handleStatusChange(post.id, status)}
                                                >
                                                    {label}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onSelect={() => setDeleteId(post.id)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <IconTrash size={14} className="mr-2" />
                                                Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce post ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le post et toutes ses révisions seront définitivement supprimés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                // Garde le dialog ouvert pendant la suppression (spinner visible)
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={pending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {pending && <IconLoader2 size={14} className="mr-1.5 animate-spin" />}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
