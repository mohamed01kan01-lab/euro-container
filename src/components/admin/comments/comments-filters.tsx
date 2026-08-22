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
    { value: "PENDING", label: "En attente" },
    { value: "APPROVED", label: "Approuvés" },
    { value: "REJECTED", label: "Rejetés" },
];

/** Partagé par les files de modération commentaires et avis. */
export function ModerationStatusFilter({
    extra,
}: {
    extra?: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const status = searchParams.get("status") ?? "";
    const hasFilters = searchParams.size > 0;

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
                <SelectTrigger className="w-44">
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

            {extra}

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
