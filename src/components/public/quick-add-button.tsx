"use client";

import { useTransition } from "react";
import { IconPlus, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { addToCart } from "@/app/[locale]/(public)/cart/actions";

/** Ajout rapide (1 unité, pas de variante) directement depuis la carte produit. */
export function QuickAddButton({
    productId,
    name,
}: {
    productId: string;
    name: string;
}) {
    const [pending, startTransition] = useTransition();

    function add() {
        startTransition(async () => {
            try {
                await addToCart({ productId, quantity: 1 });
                toast.success(`Ajouté au panier · ${name}`);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "L'ajout a échoué.",
                );
            }
        });
    }

    return (
        <button
            type="button"
            disabled={pending}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                add();
            }}
            aria-label={`Ajouter ${name} au panier`}
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow-md transition-transform hover:scale-105 hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-60"
        >
            {pending ? (
                <IconLoader2 size={18} className="animate-spin" />
            ) : (
                <IconPlus size={20} />
            )}
        </button>
    );
}
