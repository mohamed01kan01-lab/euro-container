"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX, IconSearch } from "@tabler/icons-react";
import {
    PAYMENT_STATUS,
    SHIPPING_STATUS,
    PAYMENT_VALUES,
    SHIPPING_VALUES,
} from "@/lib/order-status";

export function OrdersFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const payment = searchParams.get("payment") ?? "";
    const shipping = searchParams.get("shipping") ?? "";
    const q = searchParams.get("q") ?? "";

    const [search, setSearch] = useState(q);
    const hasFilters = payment || shipping || q;

    function buildUrl(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        const query = params.toString();
        return query ? `${pathname}?${query}` : pathname;
    }

    function setParam(key: string, value: string) {
        router.push(buildUrl(key, value));
    }

    useEffect(() => {
        if (search === q) return;
        const timer = setTimeout(() => router.push(buildUrl("q", search)), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        setSearch(q);
    }, [q]);

    return (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres">
            <div className="relative w-full sm:w-72">
                <IconSearch
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    type="search"
                    placeholder="N° de commande, nom ou email"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Rechercher une commande"
                />
            </div>

            <Select
                value={payment}
                onValueChange={(v) => setParam("payment", v === "ALL" ? "" : v)}
            >
                <SelectTrigger className="w-44">
                    <SelectValue placeholder="Tous les paiements" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tous les paiements</SelectItem>
                    {PAYMENT_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                            {PAYMENT_STATUS[s].label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={shipping}
                onValueChange={(v) => setParam("shipping", v === "ALL" ? "" : v)}
            >
                <SelectTrigger className="w-44">
                    <SelectValue placeholder="Toutes les livraisons" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Toutes les livraisons</SelectItem>
                    {SHIPPING_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                            {SHIPPING_STATUS[s].label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setSearch("");
                        router.push(pathname);
                    }}
                    className="gap-1.5"
                >
                    <IconX size={14} />
                    Réinitialiser
                </Button>
            )}
        </nav>
    );
}
