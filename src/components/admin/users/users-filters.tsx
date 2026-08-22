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
import { ROLE_LABELS, ROLE_VALUES } from "@/lib/roles";

const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Actif" },
    { value: "UNVERIFIED", label: "Non vérifié" },
    { value: "BANNED", label: "Suspendu" },
];

export function UsersFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const role = searchParams.get("role") ?? "";
    const status = searchParams.get("status") ?? "";
    const q = searchParams.get("q") ?? "";

    const [search, setSearch] = useState(q);

    const hasFilters = role || status || q;

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

    // Recherche différée : évite une navigation à chaque frappe.
    useEffect(() => {
        if (search === q) return;
        const timer = setTimeout(() => router.push(buildUrl("q", search)), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Garde le champ synchrone quand l'URL change (réinitialisation, retour arrière).
    useEffect(() => {
        setSearch(q);
    }, [q]);

    function clearFilters() {
        setSearch("");
        router.push(pathname);
    }

    return (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres">
            <div className="relative w-full sm:w-64">
                <IconSearch
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    type="search"
                    placeholder="Rechercher un nom ou un email"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Rechercher un utilisateur"
                />
            </div>

            <Select
                value={role}
                onValueChange={(v) => setParam("role", v === "ALL" ? "" : v)}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tous les rôles</SelectItem>
                    {ROLE_VALUES.map((r) => (
                        <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

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

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1.5"
                >
                    <IconX size={14} />
                    Réinitialiser
                </Button>
            )}
        </nav>
    );
}
