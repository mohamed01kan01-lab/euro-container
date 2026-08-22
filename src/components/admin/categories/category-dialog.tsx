"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { generateSlug } from "@/lib/slug";
import type {
    CategoryInput,
    SerializedCategory,
} from "@/app/(admin)/dashboard/categories/actions";

const schema = z.object({
    name: z.string().min(1, { message: "Le nom est requis" }).trim(),
    slug: z.string().min(1, { message: "Le slug est requis" }).trim(),
    description: z.string().optional(),
    parentId: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDesc: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const NO_PARENT = "__none__";

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Absent = création. */
    category: SerializedCategory | null;
    /** Toutes les catégories de l'onglet, pour le choix du parent. */
    categories: SerializedCategory[];
    onSubmit: (values: CategoryInput) => Promise<void>;
}

export function CategoryDialog({
    open,
    onOpenChange,
    category,
    categories,
    onSubmit,
}: CategoryDialogProps) {
    const slugEdited = useRef(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const parentId = watch("parentId") ?? NO_PARENT;

    // Recharge le formulaire à chaque ouverture, et le vide à la fermeture.
    useEffect(() => {
        slugEdited.current = !!category;
        reset({
            name: category?.name ?? "",
            slug: category?.slug ?? "",
            description: category?.description ?? "",
            parentId: category?.parentId ?? NO_PARENT,
            seoTitle: category?.seoTitle ?? "",
            seoDesc: category?.seoDesc ?? "",
        });
    }, [category, open, reset]);

    function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue("name", e.target.value);
        if (!slugEdited.current) {
            setValue("slug", generateSlug(e.target.value));
        }
    }

    const submit = async (values: FormValues) => {
        try {
            await onSubmit({
                ...values,
                parentId:
                    values.parentId === NO_PARENT ? null : values.parentId,
            });
            toast.success(
                category ? "Catégorie mise à jour." : "Catégorie créée.",
            );
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "L'enregistrement a échoué.",
            );
        }
    };

    // Une catégorie ne peut pas se choisir elle-même comme parent.
    const parentOptions = categories.filter((c) => c.id !== category?.id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
                    </DialogTitle>
                    <DialogDescription>
                        Le slug est généré depuis le nom et reste modifiable.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="cat-name">Nom</Label>
                        <Input
                            id="cat-name"
                            {...register("name")}
                            onChange={onNameChange}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="cat-slug">Slug</Label>
                        <Input
                            id="cat-slug"
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

                    <div className="space-y-1.5">
                        <Label htmlFor="cat-parent">Catégorie parente</Label>
                        <Select
                            value={parentId}
                            onValueChange={(v) => setValue("parentId", v)}
                        >
                            <SelectTrigger id="cat-parent" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_PARENT}>
                                    Aucune (racine)
                                </SelectItem>
                                {parentOptions.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {"— ".repeat(c.depth)}
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="cat-desc">Description</Label>
                        <Textarea
                            id="cat-desc"
                            rows={3}
                            {...register("description")}
                        />
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                        <Label htmlFor="cat-seo-title">Titre SEO</Label>
                        <Input id="cat-seo-title" {...register("seoTitle")} />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="cat-seo-desc">Meta description</Label>
                        <Textarea
                            id="cat-seo-desc"
                            rows={2}
                            {...register("seoDesc")}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
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
                            {category ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
