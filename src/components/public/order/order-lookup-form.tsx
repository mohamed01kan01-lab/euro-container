"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/public/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findMyOrder } from "@/app/[locale]/(public)/orders/actions";

export function OrderLookupForm({ defaultEmail }: { defaultEmail?: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        startTransition(async () => {
            const res = await findMyOrder({
                orderNumber: String(form.get("orderNumber") ?? ""),
                email: String(form.get("email") ?? ""),
            });
            if (res.ok) router.push(`/order/${res.orderNumber}`);
            else toast.error(res.error);
        });
    }

    return (
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
                <Label htmlFor="orderNumber">Numéro de commande</Label>
                <Input id="orderNumber" name="orderNumber" required placeholder="EC-7K2N9PQ4" className="font-mono uppercase" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="email">Email de la commande</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} />
            </div>
            <Button type="submit" variant="accent" disabled={pending}>
                {pending ? <IconLoader2 className="animate-spin" /> : <IconArrowRight />}
                Retrouver
            </Button>
        </form>
    );
}
