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
import { MediaInput } from "@/components/admin/media/media-input";
import { SeoScore } from "./seo-score";
import type { PostFormValues } from "./post-editor";

interface PostSidebarProps {
    categories: { id: string; name: string }[];
    tags: { id: string; name: string }[];
}

export function PostSidebar({ categories, tags }: PostSidebarProps) {
    const { register, watch, setValue } = useFormContext<PostFormValues>();
    const [tagOpen, setTagOpen] = useState(false);

    const status = watch("status");
    const categoryIds = watch("categoryIds") ?? [];
    const tagIds = watch("tagIds") ?? [];
    const featuredImage = watch("featuredImage") ?? "";
    const seoTitle = watch("seoTitle") ?? "";
    const seoDescription = watch("seoDescription") ?? "";
    const content = watch("content") ?? "";

    function toggleCategory(id: string) {
        if (categoryIds.includes(id)) {
            setValue("categoryIds", categoryIds.filter((c) => c !== id));
        } else {
            setValue("categoryIds", [...categoryIds, id]);
        }
    }

    function toggleTag(id: string) {
        if (tagIds.includes(id)) {
            setValue("tagIds", tagIds.filter((t) => t !== id));
        } else {
            setValue("tagIds", [...tagIds, id]);
        }
    }

    function removeTag(id: string) {
        setValue("tagIds", tagIds.filter((t) => t !== id));
    }

    const selectedTags = tags.filter((t) => tagIds.includes(t.id));

    return (
        <aside className="space-y-5">
            {/* Status */}
            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Statut
                </Label>
                <Select
                    value={status}
                    onValueChange={(v) => setValue("status", v as PostFormValues["status"])}
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

            {/* Featured image */}
            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Image à la une
                </Label>
                <MediaInput
                    value={featuredImage}
                    onChange={(url) => setValue("featuredImage", url, { shouldDirty: true })}
                    accept="image"
                    previewAspectClass="aspect-video"
                />
            </section>

            <Separator />

            {/* Categories */}
            {categories.length > 0 && (
                <>
                    <section className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Catégories
                        </Label>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`cat-${cat.id}`}
                                        checked={categoryIds.includes(cat.id)}
                                        onCheckedChange={() => toggleCategory(cat.id)}
                                    />
                                    <Label
                                        htmlFor={`cat-${cat.id}`}
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

            {/* Tags */}
            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tags
                </Label>
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {selectedTags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                                {tag.name}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag.id)}
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
                                <CommandInput placeholder="Rechercher…" className="h-8" />
                                <CommandList>
                                    <CommandEmpty>Aucun tag trouvé.</CommandEmpty>
                                    <CommandGroup>
                                        {tags.map((tag) => (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => toggleTag(tag.id)}
                                                className="gap-2"
                                            >
                                                <IconCheck
                                                    size={14}
                                                    className={tagIds.includes(tag.id) ? "opacity-100" : "opacity-0"}
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

            {/* SEO fields */}
            <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    SEO
                </Label>
                <div className="space-y-2">
                    <div>
                        <Label htmlFor="seoTitle" className="text-xs text-muted-foreground">
                            Titre ({seoTitle.length}/60)
                        </Label>
                        <Input
                            id="seoTitle"
                            {...register("seoTitle")}
                            className="text-sm mt-1"
                            maxLength={70}
                        />
                    </div>
                    <div>
                        <Label htmlFor="seoDescription" className="text-xs text-muted-foreground">
                            Meta description ({seoDescription.length}/160)
                        </Label>
                        <Textarea
                            id="seoDescription"
                            {...register("seoDescription")}
                            className="text-sm mt-1 resize-none"
                            rows={3}
                            maxLength={180}
                        />
                    </div>
                </div>
            </section>

            <Separator />

            {/* Score SEO */}
            <SeoScore
                title={seoTitle}
                description={seoDescription}
                content={content}
                image={featuredImage}
            />
        </aside>
    );
}
