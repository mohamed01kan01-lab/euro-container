import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { Logo } from "@/components/public/logo";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const settings = await getSiteSettings();

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
            <header className="mb-8 text-center">
                <Link href="/" className="inline-flex transition-opacity hover:opacity-80">
                    <Logo siteName={settings.siteName} logoUrl={settings.logo} />
                </Link>
            </header>
            <div className="w-full max-w-sm">{children}</div>
        </main>
    );
}
