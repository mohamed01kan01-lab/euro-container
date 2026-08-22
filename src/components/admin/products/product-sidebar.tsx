"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { SeoScore } from "@/components/admin/posts/seo-score";
import type { ProductFormValues } from "./product-editor";

interface ProductSidebarProps {
    categories: { id: string; name: string }[];
    tags: { id: string; name: string }[];
}

export function ProductSidebar({ categories, tags }: ProductSidebarProps) {
    const { register, watch, setValue } = useFormContext<ProductFormValues>();
    const [tagOpen, setTagOpen] = useState(false);

    const status = watch("status");
    const categoryIds = watch("categoryIds") ?? [];
    const tagIds = watch("tagIds") ?? [];
    const images = watch("images") ?? [];
    const seoTitle = watch("seoTitle") ?? "";
    const seoDescription = watch("seoDescription") ?? "";
    const description = watch("description") ?? "";

    function toggleCategory(id: string) {
        setValue(
            "categoryIds",
            categoryIds.includes(id)
                ? categoryIds.filter((c) => c !== id)
                : [...categoryIds, id],
        );
    }

    function toggleTag(id: string) {
        setValue(
            "tagIds",
            tagIds.includes(id)
                ? tagIds.filter((t) => t !== id)
                : [...tagIds, id],
        );
    }

    const selectedTags = tags.filter((t) => tagIds.includes(t.id));

    return (
        <aside className="space-y-5">
            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Statut
                </Label>
                <Select
                    value={status}
                    onValueChange={(v) =>
                        setValue("status", v as ProductFormValues["status"])
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DRAFT">Brouillon</SelectItem>
                        <SelectItem value="REVIEW">En révision</SelectItem>
                        <SelectItem value="PUBLISHED">Publié</SelectItem>
                    </SelectContent>
                </Select>
            </section>

            <Separator />

            {categories.length > 0 && (
                <>
                    <section className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Catégories
                        </Label>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center gap-2"
                                >
                                    <Checkbox
                                        id={`pcat-${cat.id}`}
                                        checked={categoryIds.includes(cat.id)}
                                        onCheckedChange={() =>
                                            toggleCategory(cat.id)
                                        }
                                    />
                                    <Label
                                        htmlFor={`pcat-${cat.id}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {cat.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </section>
                    <Separator />
                </>
            )}

            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tags
                </Label>
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {selectedTags.map((tag) => (
                            <Badge
                                key={tag.id}
                                variant="secondary"
                                className="gap-1 pr-1"
                            >
                                {tag.name}
                                <button
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className="hover:text-destructive transition-colors"
                                    aria-label={`Retirer ${tag.name}`}
                                >
                                    <IconX size={10} />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                {tags.length > 0 && (
                    <Popover open={tagOpen} onOpenChange={setTagOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-muted-foreground font-normal"
                            >
                                Ajouter un tag
                                <IconChevronDown size={14} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Rechercher…" />
                                <CommandList>
                                    <CommandEmpty>Aucun tag.</CommandEmpty>
                                    <CommandGroup>
                                        {tags.map((tag) => (
                                            <CommandItem
                                                key={tag.id}
                                                value={tag.name}
                                                onSelect={() => toggleTag(tag.id)}
                                            >
                                                <IconCheck
                                                    size={14}
                                                    className={
                                                        tagIds.includes(tag.id)
                                                            ? "mr-2 opacity-100"
                                                            : "mr-2 opacity-0"
                                                    }
                                                />
                                                {tag.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </section>

            <Separator />

            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    SEO
                </Label>
                <div className="space-y-1.5">
                    <Label htmlFor="seoTitle" className="text-sm font-normal">
                        Titre SEO
                    </Label>
                    <Input
                        id="seoTitle"
                        {...register("seoTitle")}
                        className="text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label
                        htmlFor="seoDescription"
                        className="text-sm font-normal"
                    >
                        Meta description
                    </Label>
                    <Textarea
                        id="seoDescription"
                        {...register("seoDescription")}
                        rows={3}
                        className="resize-none text-sm"
                    />
                </div>
            </section>

            {/* SeoScore est générique : la première image de la galerie joue le
                rôle d'image à la une. */}
            <SeoScore
                title={seoTitle}
                description={seoDescription}
                content={description}
                image={images[0] ?? ""}
            />
        </aside>
    );
}
