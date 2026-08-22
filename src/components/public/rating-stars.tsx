import { IconStar, IconStarFilled } from "@tabler/icons-react";

interface RatingStarsProps {
    /** Note de 0 à 5. Les demi-points sont arrondis à l'entier le plus proche. */
    value: number;
    size?: number;
    className?: string;
}

export function RatingStars({ value, size = 14, className }: RatingStarsProps) {
    const filled = Math.round(value);

    return (
        <span
            className={`inline-flex items-center gap-0.5 text-primary ${className ?? ""}`}
            role="img"
            aria-label={`${value.toFixed(1)} sur 5`}
        >
            {[1, 2, 3, 4, 5].map((star) =>
                star <= filled ? (
                    <IconStarFilled key={star} size={size} />
                ) : (
                    <IconStar
                        key={star}
                        size={size}
                        className="text-muted-foreground/40"
                    />
                ),
            )}
        </span>
    );
}
