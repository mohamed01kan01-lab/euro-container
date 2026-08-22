import Image from "next/image";
import { IconPackage } from "@tabler/icons-react";

interface TopProduct {
    id: string;
    name: string;
    image: string | null;
    sold: number;
}

interface TopProductsProps {
    products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
    if (products.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune vente enregistrée.
            </p>
        );
    }

    return (
        <ol className="space-y-3">
            {products.map((product, i) => (
                <li key={product.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">
                        {i + 1}
                    </span>
                    <figure className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                        {product.image ? (
                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                            />
                        ) : (
                            <IconPackage size={18} className="text-muted-foreground" />
                        )}
                    </figure>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sold} vente{product.sold > 1 ? "s" : ""}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
