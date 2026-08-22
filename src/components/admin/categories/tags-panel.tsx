"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconLoader2,
    IconTagOff,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateSlug } from "@/lib/slug";
import type { SerializedTag } from "@/app/(admin)/dashboard/categories/actions";

const schema = z.object({
    name: z.string().min(1, { message: "Le nom est requis" }).trim(),
    slug: z.string().min(1, { message: "Le slug est requis" }).trim(),
});
type FormValues = z.infer<typeof schema>;

interface TagsPanelProps {
    tags: SerializedTag[];
    countLabel: string;
    onCreate: (input: FormValues) => Promise<void>;
    onUpdate: (id: string, input: FormValues) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function TagsPanel({
    tags,
    countLabel,
    onCreate,
    onUpdate,
    onDelete,
}: TagsPanelProps) {
    const [pending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<SerializedTag | null>(null);
    const [deleting, setDeleting] = useState<SerializedTag | null>(null);
    const slugEdited = useRef(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        slugEdited.current = !!editing;
        reset({ name: editing?.name ?? "", slug: editing?.slug ?? "" });
    }, [editing, dialogOpen, reset]);

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }

    function openEdit(tag: SerializedTag) {
        setEditing(tag);
        setDialogOpen(true);
    }

    const submit = async (values: FormValues) => {
        try {
            if (editing) {
                await onUpdate(editing.id, values);
                toast.success("Tag mis à jour.");
            } else {
                await onCreate(values);
                toast.success("Tag créé.");
            }
            setDialogOpen(false);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "L'enregistrement a échoué. Ce nom est peut-être déjà utilisé.",
            );
        }
    };

    function handleDelete() {
        if (!deleting) return;
        const target = deleting;
        startTransition(async () => {
            try {
                await onDelete(target.id);
                toast.success(`« ${target.name} » supprimé.`);
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
                    {tags.length} tag{tags.length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" onClick={openCreate}>
                    <IconPlus size={16} className="mr-2" />
                    Nouveau tag
                </Button>
            </header>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {tags.length === 0 ? (
                    <EmptyState
                        icon={IconTagOff}
                        title="Aucun tag"
                        description="Les tags affinent le classement de vos contenus."
                        action={
                            <Button size="sm" onClick={openCreate}>
                                Nouveau tag
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
                            {tags.map((tag) => (
                                <TableRow key={tag.id}>
                                    <TableCell className="font-medium">
                                        {tag.name}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {tag.slug}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {tag.count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <RowActions
                                                label={tag.name}
                                                disabled={pending}
                                            >
                                                <DropdownMenuItem
                                                    onSelect={() => openEdit(tag)}
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
                                                        setDeleting(tag)
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Modifier le tag" : "Nouveau tag"}
                        </DialogTitle>
                        <DialogDescription>
                            Le slug est généré depuis le nom et reste modifiable.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(submit)} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="tag-name">Nom</Label>
                            <Input
                                id="tag-name"
                                {...register("name")}
                                onChange={(e) => {
                                    setValue("name", e.target.value);
                                    if (!slugEdited.current) {
                                        setValue(
                                            "slug",
                                            generateSlug(e.target.value),
                                        );
                                    }
                                }}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="tag-slug">Slug</Label>
                            <Input
                                id="tag-slug"
                                {...register("slug")}
                                onChange={(e) => {
                                    slugEdited.current = true;
                                    setValue("slug", e.target.value);
                                }}
                            />
                            {errors.slug && (
                                <p className="text-xs text-destructive">
                                    {errors.slug.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <IconLoader2
                                        size={16}
                                        className="mr-2 animate-spin"
                                    />
                                )}
                                {editing ? "Enregistrer" : "Créer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                            ne sont pas supprimés, ils perdent simplement ce tag.
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
