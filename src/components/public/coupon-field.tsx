"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconTicket, IconX } from "@tabler/icons-react";
import { Button } from "@/components/public/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { applyCoupon, removeCoupon } from "@/app/[locale]/(public)/cart/actions";

interface CouponFieldProps {
    appliedCode: string | null;
    /** Motif de refus si le code mémorisé n'est plus applicable. */
    error: string | null;
}

export function CouponField({ appliedCode, error }: CouponFieldProps) {
    const [code, setCode] = useState("");
    const [pending, startTransition] = useTransition();

    function apply(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await applyCoupon(code);
                toast.success("Code promo appliqué.");
                setCode("");
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Code promo refusé.",
                );
            }
        });
    }

    function drop() {
        startTransition(async () => {
            try {
                await removeCoupon();
                toast.success("Code promo retiré.");
            } catch {
                toast.error("Le retrait a échoué.");
            }
        });
    }

    if (appliedCode) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm">
                        <IconTicket size={15} className="text-primary" />
                        <span className="font-mono font-medium">
                            {appliedCode}
                        </span>
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={drop}
                        disabled={pending}
                    >
                        <IconX size={13} className="mr-1" />
                        Retirer
                    </Button>
                </div>

                {/* Le code reste mémorisé mais inappliqué : on dit pourquoi. */}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }

    return (
        <form onSubmit={apply} className="flex gap-2">
            <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code promo"
                aria-label="Code promo"
                className="font-mono uppercase"
            />
            <Button
                type="submit"
                variant="outline"
                disabled={pending || !code.trim()}
            >
                {pending && (
                    <IconLoader2 size={15} className="mr-1.5 animate-spin" />
                )}
                Appliquer
            </Button>
        </form>
    );
}
