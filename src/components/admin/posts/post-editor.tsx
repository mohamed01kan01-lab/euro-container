"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { IconDeviceFloppy, IconSend, IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import type { PostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createPost, updatePost } from "@/app/(admin)/dashboard/posts/actions";
import { generateSlug } from "@/lib/slug";
import { RichText } from "./rich-text";
import { PostSidebar } from "./post-sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

const schema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    slug: z.string().min(1, "Le slug est requis"),
    excerpt: z.string().optional(),
    content: z.string().optional(),
    featuredImage: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    status: z.enum(["DRAFT", "REVIEW", "PUBLISHED"]),
    categoryIds: z.array(z.string()),
    tagIds: z.array(z.string()),
});

export type PostFormValues = z.infer<typeof schema>;

export interface SerializedPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    featuredImage: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    status: PostStatus;
    categoryIds: string[];
    tagIds: string[];
}

interface PostEditorProps {
    post?: SerializedPost;
    categories: { id: string; name: string }[];
    tags: { id: string; name: string }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PostEditor({ post, categories, tags }: PostEditorProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [action, setAction] = useState<"save" | "publish" | null>(null);
    const slugEdited = useRef(false);

    const form = useForm<PostFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: post?.title ?? "",
            slug: post?.slug ?? "",
            excerpt: post?.excerpt ?? "",
            content: post?.content ?? "",
            featuredImage: post?.featuredImage ?? "",
            seoTitle: post?.seoTitle ?? "",
            seoDescription: post?.seoDescription ?? "",
            status: post?.status ?? "DRAFT",
            categoryIds: post?.categoryIds ?? [],
            tagIds: post?.tagIds ?? [],
        },
    });

    const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

    function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setValue("title", val);
        if (!slugEdited.current) {
            setValue("slug", generateSlug(val));
        }
    }

    async function save(values: PostFormValues, forcePublish = false) {
        const data = forcePublish ? { ...values, status: "PUBLISHED" as PostStatus } : values;
        if (post) {
            await updatePost(post.id, data);
            toast.success("Post mis à jour");
        } else {
            const created = await createPost(data);
            toast.success("Post créé");
            router.push(`/dashboard/posts/${created.id}`);
        }
    }

    function onSubmit(values: PostFormValues) {
        setAction("save");
        startTransition(async () => {
            try { await save(values); } catch { toast.error("Une erreur est survenue"); }
        });
    }

    function onPublish() {
        handleSubmit((values) => {
            setAction("publish");
            startTransition(async () => {
                try { await save(values, true); } catch { toast.error("Une erreur est survenue"); }
            });
        })();
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Sticky header */}
                <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href="/dashboard/posts" aria-label="Retour aux posts">
                                <IconArrowLeft size={16} />
                            </Link>
                        </Button>
                        <h1 className="text-lg font-semibold">
                            {post ? "Modifier le post" : "Nouveau post"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="submit" variant="outline" size="sm" disabled={pending}>
                            {pending && action === "save" ? (
                                <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                            ) : (
                                <IconDeviceFloppy size={15} className="mr-1.5" />
                            )}
                            Enregistrer
                        </Button>
                        <Button type="button" size="sm" disabled={pending} onClick={onPublish}>
                            {pending && action === "publish" ? (
                                <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                            ) : (
                                <IconSend size={15} className="mr-1.5" />
                            )}
                            Publier
                        </Button>
                    </div>
                </header>

                {/* Two-column layout */}
                <section className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
                    {/* Main column */}
                    <article className="space-y-5">
                        {/* Title */}
                        <div>
                            <Input
                                {...register("title")}
                                onChange={onTitleChange}
                                placeholder="Titre du post"
                                className="text-2xl font-semibold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 h-auto py-2"
                            />
                            {errors.title && (
                                <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                            )}
                        </div>

                        {/* Slug */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground shrink-0">/</span>
                            <Input
                                {...register("slug")}
                                onFocus={() => { slugEdited.current = true; }}
                                placeholder="slug-du-post"
                                className="text-sm font-mono h-8"
                            />
                            {errors.slug && (
                                <p className="text-xs text-destructive">{errors.slug.message}</p>
                            )}
                        </div>

                        <Separator />

                        {/* Excerpt */}
                        <div>
                            <Label htmlFor="excerpt" className="text-sm font-medium mb-1.5 block">
                                Extrait
                            </Label>
                            <Textarea
                                id="excerpt"
                                {...register("excerpt")}
                                placeholder="Résumé court du post affiché dans les listes…"
                                rows={3}
                                className="resize-none text-sm"
                            />
                        </div>

                        {/* Rich text editor */}
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">Contenu</Label>
                            <RichText
                                defaultValue={post?.content ?? ""}
                                onChange={(html) => setValue("content", html)}
                            />
                        </div>
                    </article>

                    {/* Sidebar */}
                    <div className="lg:sticky lg:top-4">
                        <div className="rounded-xl border border-border bg-card p-4">
                            <PostSidebar categories={categories} tags={tags} />
                        </div>
                    </div>
                </section>
            </form>
        </FormProvider>
    );
}
