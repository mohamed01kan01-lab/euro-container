"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import {
    IconDeviceFloppy,
    IconSend,
    IconArrowLeft,
    IconLoader2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RichText } from "@/components/admin/posts/rich-text";
import { MediaGalleryInput } from "@/components/admin/media/media-gallery-input";
import { generateSlug } from "@/lib/slug";
import {
    createProduct,
    updateProduct,
    type ProductInput,
    type SerializedProduct,
} from "@/app/(admin)/dashboard/products/actions";
import { ProductSidebar } from "./product-sidebar";
import { VariantsField } from "./variants-field";

// ─── Schéma ───────────────────────────────────────────────────────────────────

// Les champs numériques optionnels restent des chaînes dans le formulaire :
// z.coerce.number() transformerait une saisie vide en 0, ce qui écraserait
// « pas de prix promo » par « prix promo à zéro ».
const schema = z
    .object({
        name: z.string().min(1, { message: "Le nom est requis" }),
        slug: z.string().min(1, { message: "Le slug est requis" }),
        description: z.string().optional(),
        images: z.array(z.string()),
        price: z.coerce
            .number({ message: "Prix invalide" })
            .min(0, { message: "Le prix ne peut pas être négatif" }),
        promoPrice: z.string().optional(),
        stock: z.coerce
            .number({ message: "Stock invalide" })
            .int({ message: "Le stock doit être un entier" })
            .min(0, { message: "Le stock ne peut pas être négatif" }),
        lowStockThreshold: z.coerce
            .number({ message: "Seuil invalide" })
            .int()
            .min(0),
        weight: z.string().optional(),
        sku: z.string().optional(),
        mpn: z.string().optional(),
        gtin: z.string().optional(),
        condition: z.enum(["NEW", "USED", "REFURBISHED"]),
        googleProductCategory: z.string().optional(),
        status: z.enum(["DRAFT", "REVIEW", "PUBLISHED"]),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        categoryIds: z.array(z.string()),
        tagIds: z.array(z.string()),
        variants: z.array(
            z.object({
                name: z.string().min(1, { message: "Type requis" }),
                value: z.string().min(1, { message: "Valeur requise" }),
                stock: z.coerce.number().int().min(0),
                price: z.string().optional(),
            }),
        ),
    })
    .superRefine((data, ctx) => {
        const promo = parseOptionalNumber(data.promoPrice);
        if (data.promoPrice?.trim() && promo === null) {
            ctx.addIssue({
                code: "custom",
                path: ["promoPrice"],
                message: "Prix promo invalide",
            });
        }
        if (promo !== null && promo >= data.price) {
            ctx.addIssue({
                code: "custom",
                path: ["promoPrice"],
                message: "Le prix promo doit être inférieur au prix",
            });
        }
        if (data.weight?.trim() && parseOptionalNumber(data.weight) === null) {
            ctx.addIssue({
                code: "custom",
                path: ["weight"],
                message: "Poids invalide",
            });
        }
    });

export type ProductFormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

function parseOptionalNumber(value?: string): number | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface ProductEditorProps {
    product?: SerializedProduct;
    categories: { id: string; name: string }[];
    tags: { id: string; name: string }[];
}

export function ProductEditor({
    product,
    categories,
    tags,
}: ProductEditorProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [action, setAction] = useState<"save" | "publish" | null>(null);
    const slugEdited = useRef(!!product);

    const form = useForm<ProductFormValues, unknown, ParsedValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: product?.name ?? "",
            slug: product?.slug ?? "",
            description: product?.description ?? "",
            images: product?.images ?? [],
            price: product?.price ?? 0,
            promoPrice:
                product?.promoPrice != null ? String(product.promoPrice) : "",
            stock: product?.stock ?? 0,
            lowStockThreshold: product?.lowStockThreshold ?? 5,
            weight: product?.weight != null ? String(product.weight) : "",
            sku: product?.sku ?? "",
            mpn: product?.mpn ?? "",
            gtin: product?.gtin ?? "",
            condition: product?.condition ?? "NEW",
            googleProductCategory: product?.googleProductCategory ?? "",
            status: product?.status ?? "DRAFT",
            seoTitle: product?.seoTitle ?? "",
            seoDescription: product?.seoDescription ?? "",
            categoryIds: product?.categoryIds ?? [],
            tagIds: product?.tagIds ?? [],
            variants:
                product?.variants.map((v) => ({
                    name: v.name,
                    value: v.value,
                    stock: v.stock,
                    price: v.price != null ? String(v.price) : "",
                })) ?? [],
        },
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const images = watch("images") ?? [];
    const condition = watch("condition");

    function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue("name", e.target.value);
        if (!slugEdited.current) {
            setValue("slug", generateSlug(e.target.value));
        }
    }

    function toInput(values: ParsedValues, forcePublish: boolean): ProductInput {
        return {
            ...values,
            status: forcePublish ? "PUBLISHED" : values.status,
            promoPrice: parseOptionalNumber(values.promoPrice),
            weight: parseOptionalNumber(values.weight),
            variants: values.variants.map((v) => ({
                name: v.name,
                value: v.value,
                stock: v.stock,
                price: parseOptionalNumber(v.price),
            })),
        };
    }

    async function save(values: ParsedValues, forcePublish = false) {
        const data = toInput(values, forcePublish);
        if (product) {
            await updateProduct(product.id, data);
            toast.success("Produit mis à jour.");
        } else {
            const created = await createProduct(data);
            toast.success("Produit créé.");
            router.push(`/dashboard/products/${created.id}`);
        }
    }

    function run(values: ParsedValues, forcePublish: boolean) {
        startTransition(async () => {
            try {
                await save(values, forcePublish);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "L'enregistrement a échoué.",
                );
            }
        });
    }

    const onSubmit = (values: ParsedValues) => {
        setAction("save");
        run(values, false);
    };

    function onPublish() {
        handleSubmit((values) => {
            setAction("publish");
            run(values, true);
        })();
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                        >
                            <Link
                                href="/dashboard/products"
                                aria-label="Retour aux produits"
                            >
                                <IconArrowLeft size={16} />
                            </Link>
                        </Button>
                        <h1 className="text-lg font-semibold">
                            {product ? "Modifier le produit" : "Nouveau produit"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                        >
                            {pending && action === "save" ? (
                                <IconLoader2
                                    size={15}
                                    className="mr-1.5 animate-spin"
                                />
                            ) : (
                                <IconDeviceFloppy
                                    size={15}
                                    className="mr-1.5"
                                />
                            )}
                            Enregistrer
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            onClick={onPublish}
                        >
                            {pending && action === "publish" ? (
                                <IconLoader2
                                    size={15}
                                    className="mr-1.5 animate-spin"
                                />
                            ) : (
                                <IconSend size={15} className="mr-1.5" />
                            )}
                            Publier
                        </Button>
                    </div>
                </header>

                <section className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
                    <article className="space-y-5">
                        <div>
                            <Input
                                {...register("name")}
                                onChange={onNameChange}
                                placeholder="Nom du produit"
                                className="text-2xl font-semibold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 h-auto py-2"
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive mt-1">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground shrink-0">
                                /
                            </span>
                            <Input
                                {...register("slug")}
                                onFocus={() => {
                                    slugEdited.current = true;
                                }}
                                placeholder="slug-du-produit"
                                className="text-sm font-mono h-8"
                            />
                            {errors.slug && (
                                <p className="text-xs text-destructive">
                                    {errors.slug.message}
                                </p>
                            )}
                        </div>

                        <Separator />

                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">
                                Galerie d&apos;images
                            </Label>
                            <MediaGalleryInput
                                value={images}
                                onChange={(urls) =>
                                    setValue("images", urls, {
                                        shouldDirty: true,
                                    })
                                }
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">
                                Description
                            </Label>
                            <RichText
                                defaultValue={product?.description ?? ""}
                                onChange={(html) =>
                                    setValue("description", html)
                                }
                            />
                        </div>

                        <Separator />

                        {/* Prix et stock */}
                        <fieldset className="space-y-4">
                            <legend className="text-sm font-medium mb-2">
                                Prix et stock
                            </legend>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="price">Prix</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        {...register("price")}
                                    />
                                    {errors.price && (
                                        <p className="text-xs text-destructive">
                                            {errors.price.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="promoPrice">
                                        Prix promo
                                    </Label>
                                    <Input
                                        id="promoPrice"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="—"
                                        {...register("promoPrice")}
                                    />
                                    {errors.promoPrice && (
                                        <p className="text-xs text-destructive">
                                            {errors.promoPrice.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="stock">Stock</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        min={0}
                                        {...register("stock")}
                                    />
                                    {errors.stock && (
                                        <p className="text-xs text-destructive">
                                            {errors.stock.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="lowStockThreshold">
                                        Seuil de stock faible
                                    </Label>
                                    <Input
                                        id="lowStockThreshold"
                                        type="number"
                                        min={0}
                                        {...register("lowStockThreshold")}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <Separator />

                        {/* Variantes */}
                        <fieldset>
                            <legend className="text-sm font-medium mb-2">
                                Variantes
                            </legend>
                            <VariantsField />
                        </fieldset>

                        <Separator />

                        {/* Identifiants produit */}
                        <fieldset className="space-y-4">
                            <legend className="text-sm font-medium mb-2">
                                Identifiants et livraison
                            </legend>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input id="sku" {...register("sku")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="weight">Poids (kg)</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        placeholder="—"
                                        {...register("weight")}
                                    />
                                    {errors.weight && (
                                        <p className="text-xs text-destructive">
                                            {errors.weight.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="mpn">
                                        MPN (réf. fabricant)
                                    </Label>
                                    <Input id="mpn" {...register("mpn")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="gtin">GTIN / EAN</Label>
                                    <Input id="gtin" {...register("gtin")} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="condition">État</Label>
                                    <Select
                                        value={condition}
                                        onValueChange={(v) =>
                                            setValue(
                                                "condition",
                                                v as ProductFormValues["condition"],
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="condition"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NEW">
                                                Neuf
                                            </SelectItem>
                                            <SelectItem value="USED">
                                                Occasion
                                            </SelectItem>
                                            <SelectItem value="REFURBISHED">
                                                Reconditionné
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="googleProductCategory">
                                        Catégorie Google
                                    </Label>
                                    <Input
                                        id="googleProductCategory"
                                        placeholder="ID taxonomie"
                                        {...register("googleProductCategory")}
                                    />
                                </div>
                            </div>
                        </fieldset>
                    </article>

                    <div className="lg:sticky lg:top-4">
                        <div className="rounded-xl border border-border bg-card p-4">
                            <ProductSidebar
                                categories={categories}
                                tags={tags}
                            />
                        </div>
                    </div>
                </section>
            </form>
        </FormProvider>
    );
}
