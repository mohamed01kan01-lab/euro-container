"use client";

import { Progress } from "@/components/ui/progress";

interface SeoScoreProps {
    title: string;
    description: string;
    content: string;
    image: string;
}

function countWords(html: string): number {
    return html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function computeScore(title: string, description: string, content: string, image: string) {
    const suggestions: string[] = [];
    let score = 0;

    const titleLen = title.trim().length;
    if (titleLen >= 10 && titleLen <= 60) {
        score += 25;
    } else {
        if (titleLen === 0) suggestions.push("Ajoutez un titre SEO (10–60 caractères)");
        else if (titleLen < 10) suggestions.push("Titre SEO trop court (min 10 caractères)");
        else suggestions.push("Titre SEO trop long (max 60 caractères)");
    }

    const descLen = description.trim().length;
    if (descLen >= 50 && descLen <= 160) {
        score += 25;
    } else {
        if (descLen === 0) suggestions.push("Ajoutez une meta description (50–160 caractères)");
        else if (descLen < 50) suggestions.push("Meta description trop courte (min 50 caractères)");
        else suggestions.push("Meta description trop longue (max 160 caractères)");
    }

    const words = countWords(content);
    if (words >= 300) {
        score += 25;
    } else {
        suggestions.push(`Contenu trop court (${words} mots, min 300)`);
    }

    if (image.trim()) {
        score += 25;
    } else {
        suggestions.push("Ajoutez une image à la une");
    }

    return { score, suggestions: suggestions.slice(0, 3) };
}

export function SeoScore({ title, description, content, image }: SeoScoreProps) {
    const { score, suggestions } = computeScore(title, description, content, image);

    const color =
        score >= 75 ? "text-green-600 dark:text-green-400" :
        score >= 50 ? "text-orange-500" :
        "text-destructive";

    const indicatorColor =
        score >= 75 ? "[&>div]:bg-green-500" :
        score >= 50 ? "[&>div]:bg-orange-500" :
        "[&>div]:bg-destructive";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Score SEO</span>
                <span className={`text-xs font-semibold ${color}`}>{score}/100</span>
            </div>
            <Progress value={score} className={`h-1.5 ${indicatorColor}`} />
            {suggestions.length > 0 && (
                <ul className="space-y-1">
                    {suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5 items-start">
                            <span className="mt-0.5 shrink-0">·</span>
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
