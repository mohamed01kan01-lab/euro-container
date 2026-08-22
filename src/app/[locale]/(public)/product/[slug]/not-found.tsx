import { Link } from "@/i18n/routing";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/public/button";

export default function ProductNotFound() {
    return (
        <main className="flex flex-col items-center justify-center gap-8 px-4 py-24">
            <header className="text-center space-y-2">
                <p className="text-sm font-semibold text-primary tracking-widest uppercase">
                    Erreur 404
                </p>
                <h1 className="font-display text-5xl tracking-tight">
                    Produit introuvable
                </h1>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                    Ce produit n&apos;existe pas ou n&apos;est plus en vente.
                    Découvrez le reste de la boutique.
                </p>
            </header>
            <Button asChild>
                <Link href="/shop">
                    <IconArrowLeft size={16} className="mr-2" />
                    Retour à la boutique
                </Link>
            </Button>
        </main>
    );
}
