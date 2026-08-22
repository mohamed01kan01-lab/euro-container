import { IconFileUnknown } from "@tabler/icons-react";

export default function AdminNotFound() {
    return (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
            <figure className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <IconFileUnknown size={40} className="text-muted-foreground" />
            </figure>
            <header className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">404</h1>
                <p className="text-lg font-medium">Page introuvable</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                    La page que vous cherchez n&apos;existe pas ou a été
                    déplacée.
                </p>
            </header>
        </section>
    );
}
