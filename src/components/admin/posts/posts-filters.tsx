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

interface Category {
    id: string;
    name: string;
}

interface Author {
    id: string;
    name: string;
}

interface PostsFiltersProps {
    categories: Category[];
    authors: Author[];
}

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Brouillon" },
    { value: "REVIEW", label: "En révision" },
    { value: "PUBLISHED", label: "Publié" },
];

export function PostsFilters({ categories, authors }: PostsFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const status = searchParams.get("status") ?? "";
    const authorId = searchParams.get("author") ?? "";
    const categoryId = searchParams.get("category") ?? "";

    const hasFilters = status || authorId || categoryId;

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`);
    }

    function clearFilters() {
        router.push(pathname);
    }

    return (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres">
            <Select value={status} onValueChange={(v) => setParam("status", v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {categories.length > 0 && (
                <Select value={categoryId} onValueChange={(v) => setParam("category", v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Toutes les catégories</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {authors.length > 1 && (
                <Select value={authorId} onValueChange={(v) => setParam("author", v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Tous les auteurs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tous les auteurs</SelectItem>
                        {authors.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                    <IconX size={14} />
                    Réinitialiser
                </Button>
            )}
        </nav>
    );
}
