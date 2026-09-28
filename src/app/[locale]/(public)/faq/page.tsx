import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IconHeadset, IconMail, IconPhone } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { fillLegal, legalVars } from "@/lib/legal";
import { Button } from "@/components/public/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqCategory {
    title: string;
    items: { question: string; answer: string }[];
}

export async function generateMetadata(): Promise<Metadata> {
    const [t, settings] = await Promise.all([getTranslations("faq"), getSiteSettings()]);
    return {
        title: `${t("title")} — ${settings.siteName}`,
        description: t("intro"),
        robots: { index: true, follow: true },
    };
}

export default async function FaqPage() {
    const [t, tLegal, settings] = await Promise.all([
        getTranslations("faq"),
        getTranslations("legal"),
        getSiteSettings(),
    ]);
    const vars = legalVars(settings);
    const todo = tLegal("todo");
    // Délai de réservation, taux de TVA… repris des réglages : la FAQ reste
    // exacte quand ils changent.
    const categories = (t.raw("categories") as FaqCategory[]).map((c) => ({
        ...c,
        items: c.items.map((i) => ({ question: i.question, answer: fillLegal(i.answer, vars, todo) })),
    }));

    // Données structurées FAQPage : éligibilité aux résultats enrichis Google.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: categories.flatMap((c) =>
            c.items.map((i) => ({
                "@type": "Question",
                name: i.question,
                acceptedAnswer: { "@type": "Answer", text: i.answer },
            })),
        ),
    };

    return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <script
                type="application/ld+json"
                // Contenu issu de nos fichiers de traduction, échappé pour une balise script.
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />

            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">{t("intro")}</p>

            <nav className="mt-8 flex flex-wrap gap-2" aria-label={t("title")}>
                {categories.map((c, index) => (
                    <a
                        key={c.title}
                        href={`#faq-${index}`}
                        className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-foreground/40"
                    >
                        {c.title}
                    </a>
                ))}
            </nav>

            <div className="mt-10 space-y-10">
                {categories.map((c, ci) => (
                    <div key={c.title} id={`faq-${ci}`} className="scroll-mt-24">
                        <h2 className="mb-2 font-display text-xl">{c.title}</h2>
                        <Accordion type="single" collapsible className="rounded-[24px] border border-border bg-card px-5">
                            {c.items.map((item, ii) => (
                                <AccordionItem key={ii} value={`${ci}-${ii}`}>
                                    <AccordionTrigger className="text-left font-semibold">{item.question}</AccordionTrigger>
                                    <AccordionContent className="leading-relaxed text-muted-foreground">{item.answer}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ))}
            </div>

            <aside className="mt-14 flex flex-col items-center gap-4 rounded-[30px] bg-foreground px-6 py-10 text-center text-background">
                <IconHeadset size={30} className="text-orange-500" />
                <div>
                    <h2 className="font-display text-2xl">{t("contactTitle")}</h2>
                    <p className="mt-2 text-sm opacity-80">{t("contactText")}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <Button asChild variant="accent">
                        <Link href="/contact">
                            <IconMail /> {t("contactCta")}
                        </Link>
                    </Button>
                    {settings.phone && (
                        <Button asChild variant="outline" className="border-background/30 text-background hover:bg-background/10 hover:text-background">
                            <a href={`tel:${settings.phone}`}>
                                <IconPhone /> {settings.phone}
                            </a>
                        </Button>
                    )}
                </div>
            </aside>
        </section>
    );
}
