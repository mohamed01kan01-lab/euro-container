import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const settings = await getSiteSettings();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return {
        alternates: {
            languages: Object.fromEntries(
                routing.locales.map((l) => [
                    l,
                    l === routing.defaultLocale ? "/" : `/${l}`,
                ]),
            ),
        },
        openGraph: {
            locale: locale === "en" ? "en_US" : "fr_FR",
            siteName: settings.siteName,
            url: appUrl,
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
        notFound();
    }

    setRequestLocale(locale);

    return children;
}
