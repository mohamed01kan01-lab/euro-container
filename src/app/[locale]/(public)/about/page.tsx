import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
    IconShieldCheck,
    IconReceipt2,
    IconTruckDelivery,
    IconHeadset,
    IconArrowRight,
} from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { Button } from "@/components/public/button";
import { SectionEyebrow } from "@/components/public/section-eyebrow";

interface ValueItem {
    title: string;
    body: string;
}

interface ProcessStep {
    title: string;
    body: string;
}

const VALUE_ICONS = [IconShieldCheck, IconReceipt2, IconTruckDelivery, IconHeadset];

export async function generateMetadata(): Promise<Metadata> {
    const [t, settings] = await Promise.all([
        getTranslations("about"),
        getSiteSettings(),
    ]);
    return {
        title: `${t("title")} — ${settings.siteName}`,
        description: t("intro"),
        robots: { index: true, follow: true },
    };
}

export default async function AboutPage() {
    const [t, tHome, totalProducts, totalCategories] = await Promise.all([
        getTranslations("about"),
        getTranslations("home"),
        prisma.product.count({ where: { status: "PUBLISHED" } }),
        prisma.productCategory.count({ where: { parentId: null } }),
    ]);

    const values = t.raw("values") as ValueItem[];
    const process = t.raw("process") as ProcessStep[];

    return (
        <>
            {/* Hero */}
            <section className="border-b border-border bg-linear-to-b from-secondary/60 to-background">
                <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
                    <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
                    <h1 className="mt-3 font-display text-3xl tracking-tight text-balance sm:text-4xl">
                        {t("title")}
                    </h1>
                    <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
                        {t("intro")}
                    </p>
                </div>
            </section>

            {/* Stats */}
            <section className="border-b border-border">
                <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 px-4 py-6 text-center sm:py-8">
                    <div>
                        <p className="font-display text-2xl tracking-tight sm:text-3xl">
                            {totalProducts}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {tHome("statsProducts", { count: totalProducts })}
                        </p>
                    </div>
                    <div>
                        <p className="font-display text-2xl tracking-tight sm:text-3xl">
                            {totalCategories}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {tHome("statsCategories", { count: totalCategories })}
                        </p>
                    </div>
                    <div>
                        <p className="font-display text-2xl tracking-tight sm:text-3xl">20+</p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {tHome("statsYears")}
                        </p>
                    </div>
                </div>
            </section>

            {/* Histoire */}
            <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
                <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                    {t("storyTitle")}
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
                    <p>{t("storyBody1")}</p>
                    <p>{t("storyBody2")}</p>
                </div>
            </section>

            {/* Valeurs */}
            <section className="border-t border-border bg-secondary/30">
                <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
                    <div className="max-w-xl">
                        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                            {t("valuesTitle")}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            {t("valuesSubtitle")}
                        </p>
                    </div>
                    <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        {values.map((value, index) => {
                            const Icon = VALUE_ICONS[index] ?? IconShieldCheck;
                            return (
                                <div key={value.title} className="flex items-start gap-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Icon size={22} />
                                    </span>
                                    <div>
                                        <p className="font-semibold">{value.title}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                            {value.body}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Processus */}
            <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
                <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                    {t("processTitle")}
                </h2>
                <div className="mt-8 grid gap-8 sm:grid-cols-3">
                    {process.map((step, index) => (
                        <div key={step.title} className="relative pl-12">
                            <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
                                {index + 1}
                            </span>
                            <p className="font-semibold">{step.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {step.body}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-border">
                <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
                    <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                        {t("ctaTitle")}
                    </h2>
                    <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
                        {t("ctaBody")}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild size="lg" variant="accent">
                            <Link href="/shop">
                                {tHome("ctaShop")}
                                <IconArrowRight size={18} className="ml-1.5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/contact">{tHome("ctaContact")}</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
