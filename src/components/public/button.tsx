import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Bouton pour la partie publique du site : mêmes primitives (cva + Slot)
 * que `components/ui/button`, mais un langage visuel volontairement
 * différent (pilule, majuscules + gras sur le CTA principal, lift au survol)
 * pour ne pas ressembler à un bouton shadcn par défaut.
 */
const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-full border-2 border-transparent bg-clip-padding font-display text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-[0_10px_24px_-8px_var(--color-primary)] hover:-translate-y-0.5 hover:bg-primary/90",
                accent:
                    "bg-orange-600 uppercase tracking-wide text-white shadow-[0_14px_28px_-10px_rgba(234,88,12,.55)] hover:-translate-y-0.5 hover:bg-orange-700 focus-visible:ring-orange-600/40",
                outline:
                    "border-foreground/25 bg-transparent text-foreground hover:-translate-y-0.5 hover:border-foreground hover:bg-secondary",
                ghost: "text-foreground hover:bg-secondary",
            },
            size: {
                default: "h-10 gap-1.5 px-5",
                sm: "h-9 gap-1 px-4 text-[0.8rem]",
                lg: "h-12 gap-2 px-7 text-[0.95rem]",
                icon: "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot.Root : "button";

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
