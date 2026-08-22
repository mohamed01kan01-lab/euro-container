import { Link } from "@/i18n/routing";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function BlogNotFound() {
    return (
        <main className="flex flex-col items-center justify-center gap-8 px-4 py-24">
            <header className="text-center space-y-2">
                <p className="text-sm font-semibold text-primary tracking-widest uppercase">
                    Erreur 404
                </p>
                <h1 className="text-5xl font-bold tracking-tight">Article introuvable</h1>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                    Cet article n&apos;existe pas ou a été dépublié.
                    Découvrez les autres articles du blog.
                </p>
            </header>
            <Button asChild>
                <Link href="/blog">
                    <IconArrowLeft size={16} className="mr-2" />
                    Retour au blog
                </Link>
            </Button>
        </main>
    );
}
