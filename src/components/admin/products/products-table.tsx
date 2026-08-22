"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    IconEdit,
    IconEye,
    IconTrash,
    IconLoader2,
    IconPhoto,
    IconPackageOff,
} from "@tabler/icons-react";
import type { ProductStatus } from "@prisma/client";
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
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/admin/ui/row-actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import {
    StatusBadge,
    type StatusTone,
} from "@/components/admin/ui/status-badge";
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
import { formatPrice } from "@/lib/currency";
import { RatingStars } from "@/components/public/rating-stars";
import {
    deleteProduct,
    updateProductStatus,
    type ProductRow,
} from "@/app/(admin)/dashboard/products/actions";

const STATUS_CONFIG: Record<
    ProductStatus,
    { label: string; variant: "default" | "secondary" | "outline" }
> = {
    DRAFT: { label: "Brouillon", variant: "secondary" },
    REVIEW: { label: "En révision", variant: "outline" },
    PUBLISHED: { label: "Publié", variant: "default" },
};

const NEXT_STATUS: Record<ProductStatus, { status: ProductStatus; label: string }[]> = {
    DRAFT: [{ status: "REVIEW", label: "Soumettre en révision" }],
    REVIEW: [
        { status: "PUBLISHED", label: "Publier" },
        { status: "DRAFT", label: "Remettre en brouillon" },
    ],
    PUBLISHED: [{ status: "DRAFT", label: "Dépublier" }],
};

/** Badges de stock de la spec 3.4 : rupture, stock faible, en stock. */
function stockBadge(
    stock: number,
    threshold: number,
): { label: string; tone: StatusTone } {
    if (stock <= 0) return { label: "Rupture", tone: "danger" };
    if (stock <= threshold) {
        return { label: `Stock faible (${stock})`, tone: "warning" };
    }
    return { label: `En stock (${stock})`, tone: "success" };
}

interface ProductsTableProps {
    products: ProductRow[];
    currency: string;
}

export function ProductsTable({ products, currency }: ProductsTableProps) {
    const [pending, startTransition] = useTransition();
    const [deleting, setDeleting] = useState<ProductRow | null>(null);

    function handleStatusChange(id: string, status: ProductStatus) {
        startTransition(async () => {
            try {
                await updateProductStatus(id, status);
                toast.success("Statut mis à jour.");
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La mise à jour a échoué.",
                );
            }
        });
    }

    function handleDelete() {
        if (!deleting) return;
        const target = deleting;
        startTransition(async () => {
            try {
                await deleteProduct(target.id);
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

    if (products.length === 0) {
        return (
            <EmptyState
                icon={IconPackageOff}
                title="Aucun produit"
                description="Aucun produit ne correspond à ces critères. Ajustez les filtres ou créez votre premier produit."
                action={
                    <Button size="sm" asChild>
                        <Link href="/dashboard/products/new">
                            Nouveau produit
                        </Link>
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-14" />
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Catégories</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => {
                        const cfg = STATUS_CONFIG[product.status];
                        const stock = stockBadge(
                            product.stock,
                            product.lowStockThreshold,
                        );
                        return (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <IconPhoto
                                                size={16}
                                                className="text-muted-foreground"
                                            />
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="font-medium max-w-xs truncate">
                                    <Link
                                        href={`/dashboard/products/${product.id}`}
                                        className="hover:text-primary transition-colors"
                                    >
                                        {product.name}
                                    </Link>
                                </TableCell>

                                <TableCell className="whitespace-nowrap text-sm">
                                    {product.promoPrice != null ? (
                                        <span className="flex items-center gap-1.5">
                                            <span className="font-medium">
                                                {formatPrice(
                                                    product.promoPrice,
                                                    currency,
                                                )}
                                            </span>
                                            <s className="text-xs text-muted-foreground">
                                                {formatPrice(
                                                    product.price,
                                                    currency,
                                                )}
                                            </s>
                                        </span>
                                    ) : (
                                        formatPrice(product.price, currency)
                                    )}
                                </TableCell>

                                <TableCell>
                                    <StatusBadge tone={stock.tone}>
                                        {stock.label}
                                    </StatusBadge>
                                </TableCell>

                                <TableCell>
                                    {product.rating ? (
                                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                                            <RatingStars
                                                value={product.rating.average}
                                                size={12}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                ({product.rating.count})
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {product.categories.length === 0 ? (
                                            <span className="text-xs text-muted-foreground">
                                                —
                                            </span>
                                        ) : (
                                            product.categories
                                                .slice(0, 2)
                                                .map((c) => (
                                                    <Badge
                                                        key={c.id}
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {c.name}
                                                    </Badge>
                                                ))
                                        )}
                                        {product.categories.length > 2 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{product.categories.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <Badge variant={cfg.variant}>
                                        {cfg.label}
                                    </Badge>
                                </TableCell>

                                <TableCell>
                                    <RowActions label={product.name}>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={`/dashboard/products/${product.id}`}
                                                >
                                                    <IconEdit
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Modifier
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={`/product/${product.slug}`}
                                                    target="_blank"
                                                >
                                                    <IconEye
                                                        size={14}
                                                        className="mr-2"
                                                    />
                                                    Voir
                                                </Link>
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />
                                            {NEXT_STATUS[product.status].map(
                                                ({ status, label }) => (
                                                    <DropdownMenuItem
                                                        key={status}
                                                        disabled={pending}
                                                        onSelect={() =>
                                                            handleStatusChange(
                                                                product.id,
                                                                status,
                                                            )
                                                        }
                                                    >
                                                        {label}
                                                    </DropdownMenuItem>
                                                ),
                                            )}

                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    setDeleting(product)
                                                }
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <IconTrash
                                                    size={14}
                                                    className="mr-2"
                                                />
                                                Supprimer
                                            </DropdownMenuItem>
                                    </RowActions>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

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
                            Cette action est irréversible. Le produit, ses
                            variantes et ses avis seront définitivement
                            supprimés.
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
        </>
    );
}
