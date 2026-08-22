"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/** Filtre par note, complète le filtre de statut partagé. */
export function RatingFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const rating = searchParams.get("rating") ?? "";

    function setRating(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set("rating", value);
        } else {
            params.delete("rating");
        }
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    }

    return (
        <Select
            value={rating}
            onValueChange={(v) => setRating(v === "ALL" ? "" : v)}
        >
            <SelectTrigger className="w-40">
                <SelectValue placeholder="Toutes les notes" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">Toutes les notes</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                        {n} étoile{n > 1 ? "s" : ""}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
