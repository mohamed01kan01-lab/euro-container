"use client";

import { useTransition } from "react";
import { Link } from "@/i18n/routing";
import { IconTrash, IconPhoto } from "@tabler/icons-react";
import { Button } from "@/components/public/button";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
import type { CartLine } from "@/lib/cart";
import { updateQuantity, removeFromCart } from "@/app/[locale]/(public)/cart/actions";
import { QuantitySelector } from "./quantity-selector";

interface CartLinesProps {
    lines: CartLine[];
    currency: string;
}

export function CartLines({ lines, currency }: CartLinesProps) {
    const [pending, startTransition] = useTransition();

    function change(line: CartLine, quantity: number) {
        startTransition(async () => {
            try {
                await updateQuantity(line.productId, line.variantId, quantity);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "La mise à jour a échoué.",
                );
            }
        });
    }

    function remove(line: CartLine) {
        startTransition(async () => {
            try {
                await removeFromCart(line.productId, line.variantId);
                toast.success("Article retiré du panier.");
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Le retrait a échoué.",
                );
            }
        });
    }

    return (
        <ul className="divide-y divide-border">
            {lines.map((line) => (
                <li key={line.key} className="flex gap-4 py-4 first:pt-0">
                    <Link
                        href={`/product/${line.slug}`}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted"
                        tabIndex={-1}
                        aria-hidden
                    >
                        {line.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={line.image}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center">
                                <IconPhoto
                                    size={18}
                                    className="text-muted-foreground"
                                />
                            </span>
                        )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-sm font-medium">
                                    <Link
                                        href={`/product/${line.slug}`}
                                        className="transition-colors hover:text-primary"
                                    >
                                        {line.name}
                                    </Link>
                                </h3>
                                {line.variantLabel && (
                                    <p className="text-xs text-muted-foreground">
                                        {line.variantLabel}
                                    </p>
                                )}
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {formatPrice(line.unitPrice, currency)} HT
                                    l&apos;unité
                                </p>
                            </div>

                            <p className="whitespace-nowrap font-display text-base">
                                {formatPrice(line.lineTotal, currency)}
                                <span className="ml-1 font-sans text-xs text-muted-foreground">HT</span>
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <QuantitySelector
                                value={line.quantity}
                                onChange={(q) => change(line, q)}
                                max={line.stock}
                                disabled={pending}
                            />

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => remove(line)}
                                disabled={pending}
                            >
                                <IconTrash size={14} />
                                Retirer
                            </Button>
                        </div>

                        {line.quantity >= line.stock && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                Quantité limitée au stock disponible (
                                {line.stock}).
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
