import { formatPrice } from "@/lib/currency";
import { withTax } from "@/lib/tax";
import { cn } from "@/lib/utils";

interface PriceTagProps {
    /** Prix HT (catalogue). */
    ht: number;
    /** Ancien prix HT, barré, en cas de promotion. */
    compareAtHt?: number | null;
    currency: string;
    vatRate: number;
    size?: "sm" | "lg";
    className?: string;
}

/**
 * Prix HT mis en avant (clientèle majoritairement professionnelle) et prix TTC
 * affiché juste dessous : obligatoire dès lors que l'on vend aussi aux
 * particuliers.
 */
export function PriceTag({ ht, compareAtHt, currency, vatRate, size = "sm", className }: PriceTagProps) {
    const onSale = compareAtHt != null && compareAtHt > ht;
    return (
        <span className={cn("flex flex-col", className)}>
            <span className="flex flex-wrap items-baseline gap-x-2">
                <span
                    className={cn(
                        "font-display",
                        size === "lg" ? "text-3xl" : "text-lg",
                        onSale && "text-orange-600 dark:text-orange-400",
                    )}
                >
                    {formatPrice(ht, currency)}
                </span>
                <span className={cn("font-semibold text-muted-foreground", size === "lg" ? "text-sm" : "text-xs")}>HT</span>
                {onSale && (
                    <s className={cn("text-muted-foreground", size === "lg" ? "text-lg" : "text-xs")}>
                        {formatPrice(compareAtHt, currency)}
                    </s>
                )}
            </span>
            <span className={cn("text-muted-foreground", size === "lg" ? "text-sm" : "text-xs")}>
                {formatPrice(withTax(ht, vatRate), currency)} TTC
            </span>
        </span>
    );
}
