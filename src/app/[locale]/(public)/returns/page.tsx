import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";

export async function generateMetadata(): Promise<Metadata> {
    const [t, settings] = await Promise.all([
        getTranslations("returns"),
        getSiteSettings(),
    ]);
    return {
        title: `${t("title")} — ${settings.siteName}`,
        robots: { index: true, follow: true },
    };
}

export default async function ReturnsPage() {
    const t = await getTranslations("returns");

    return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                {t("title")}
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
                {t("body")}
            </p>
        </section>
    );
}
