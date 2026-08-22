import { prisma } from "@/lib/prisma";

export interface ProductRating {
    average: number;
    count: number;
}

/**
 * Note moyenne des produits passés, en une seule requête.
 * Agréger carte par carte ferait une requête par produit sur une grille de
 * douze — d'où le groupBy unique et la jointure en mémoire.
 * Seuls les avis approuvés comptent.
 */
export async function getRatingMap(
    productIds: string[],
): Promise<Map<string, ProductRating>> {
    if (productIds.length === 0) return new Map();

    const rows = await prisma.productReview.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds }, status: "APPROVED" },
        _avg: { rating: true },
        _count: { rating: true },
    });

    return new Map(
        rows.map((row) => [
            row.productId,
            {
                average: row._avg.rating ?? 0,
                count: row._count.rating,
            },
        ]),
    );
}
