"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Brouillon" },
    { value: "REVIEW", label: "En révision" },
    { value: "PUBLISHED", label: "Publié" },
];

const STOCK_OPTIONS = [
    { value: "IN_STOCK", label: "En stock" },
    { value: "LOW", label: "Stock faible" },
    { value: "OUT", label: "Rupture" },
];

interface ProductsFiltersProps {
    categories: { id: string; name: string }[];
}

export function ProductsFilters({ categories }: ProductsFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const status = searchParams.get("status") ?? "";
    const categoryId = searchParams.get("category") ?? "";
    const stock = searchParams.get("stock") ?? "";

    const hasFilters = status || categoryId || stock;

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    }

    return (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres">
            <Select
                value={status}
                onValueChange={(v) => setParam("status", v === "ALL" ? "" : v)}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {categories.length > 0 && (
                <Select
                    value={categoryId}
                    onValueChange={(v) =>
                        setParam("category", v === "ALL" ? "" : v)
                    }
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">
                            Toutes les catégories
                        </SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <Select
                value={stock}
                onValueChange={(v) => setParam("stock", v === "ALL" ? "" : v)}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tout le stock" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tout le stock</SelectItem>
                    {STOCK_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(pathname)}
                    className="gap-1.5"
                >
                    <IconX size={14} />
                    Réinitialiser
                </Button>
            )}
        </nav>
    );
}
