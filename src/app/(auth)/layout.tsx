import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
            <header className="mb-8 text-center">
                <span className="text-2xl font-bold text-primary tracking-tight">NextPress</span>
            </header>
            <div className="w-full max-w-sm">{children}</div>
        </main>
    );
}
