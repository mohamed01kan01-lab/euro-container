import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 bg-background">
            <header className="text-center space-y-1">
                <p className="text-sm font-semibold text-primary tracking-widest uppercase">
                    Erreur 404
                </p>
                <h1 className="font-display text-6xl tracking-tight">
                    Page introuvable
                </h1>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                    Cette page n&apos;existe pas ou a été supprimée.
                    Vérifiez l&apos;URL ou retournez à l&apos;accueil.
                </p>
            </header>

            <Button asChild>
                <Link href="/">
                    <IconArrowLeft size={16} className="mr-2" />
                    Retour à l&apos;accueil
                </Link>
            </Button>
        </main>
    );
}
