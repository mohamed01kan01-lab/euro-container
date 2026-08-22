import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Bouton pour la partie publique du site : mêmes primitives (cva + Slot)
 * que `components/ui/button`, mais un langage visuel volontairement
 * différent (angles francs, empattement bas, majuscules sur le CTA
 * principal) pour ne pas ressembler à un bouton shadcn par défaut.
 */
const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-b-[3px] bg-clip-padding font-heading text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px active:border-b disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90",
                accent:
                    "border-orange-900/60 bg-orange-600 uppercase tracking-wide text-white hover:bg-orange-700 focus-visible:ring-orange-600/40",
                outline:
                    "border-border bg-transparent text-foreground hover:bg-secondary hover:border-foreground/30",
                ghost:
                    "border-transparent text-foreground hover:bg-secondary",
            },
            size: {
                default: "h-9 gap-1.5 px-4",
                sm: "h-8 gap-1 px-3 text-[0.8rem]",
                lg: "h-11 gap-2 px-6 text-[0.95rem]",
                icon: "size-9",
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
