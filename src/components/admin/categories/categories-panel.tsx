"use client";

import { useState, useTransition } from "react";
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconLoader2,
    IconCornerDownRight,
    IconFolderOff,
} from "@tabler/icons-react";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CategoryDialog } from "./category-dialog";
import type {
    CategoryInput,
    SerializedCategory,
} from "@/app/(admin)/dashboard/categories/actions";

interface CategoriesPanelProps {
    categories: SerializedCategory[];
    /** Libellé de la colonne de comptage : « produits » ou « posts ». */
    countLabel: string;
    onCreate: (input: CategoryInput) => Promise<void>;
    onUpdate: (id: string, input: CategoryInput) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function CategoriesPanel({
    categories,
    countLabel,
    onCreate,
    onUpdate,
    onDelete,
}: CategoriesPanelProps) {
    const [pending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<SerializedCategory | null>(null);
    const [deleting, setDeleting] = useState<SerializedCategory | null>(null);

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }

    function openEdit(category: SerializedCategory) {
        setEditing(category);
        setDialogOpen(true);
    }

    function handleDelete() {
        if (!deleting) return;
        const target = deleting;
        startTransition(async () => {
            try {
                await onDelete(target.id);
                toast.success(`« ${target.name} » supprimée.`);
                setDeleting(null);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La suppression a échoué.",
                );
            }
        });
    }

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    {categories.length} catégorie
                    {categories.length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" onClick={openCreate}>
                    <IconPlus size={16} className="mr-2" />
                    Nouvelle catégorie
                </Button>
            </header>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {categories.length === 0 ? (
                    <EmptyState
                        icon={IconFolderOff}
                        title="Aucune catégorie"
                        description="Créez une première catégorie pour organiser vos contenus."
                        action={
                            <Button size="sm" onClick={openCreate}>
                                Nouvelle catégorie
                            </Button>
                        }
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="w-28">
                                    {countLabel}
                                </TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <span
                                            className="flex items-center gap-1.5"
                                            style={{
                                                paddingLeft: `${category.depth * 20}px`,
                                            }}
                                        >
                                            {category.depth > 0 && (
                                                <IconCornerDownRight
                                                    size={14}
                                                    className="text-muted-foreground shrink-0"
                                                />
                                            )}
                                            {category.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {category.slug}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {category.count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <RowActions
                                                label={category.name}
                                                disabled={pending}
                                            >
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        openEdit(category)
                                                    }
                                                >
                                                    <IconEdit
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Modifier
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        setDeleting(category)
                                                    }
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                >
                                                    <IconTrash
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </RowActions>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <CategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                category={editing}
                categories={categories}
                onSubmit={(values) =>
                    editing ? onUpdate(editing.id, values) : onCreate(values)
                }
            />

            <AlertDialog
                open={!!deleting}
                onOpenChange={(o) => !o && setDeleting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer « {deleting?.name} » ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Les contenus associés
                            ne sont pas supprimés, ils perdent simplement cette
                            catégorie.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={pending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {pending && (
                                <IconLoader2
                                    size={14}
                                    className="mr-1.5 animate-spin"
                                />
                            )}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
