import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
    question: string;
    answer: string;
}

export async function generateMetadata(): Promise<Metadata> {
    const [t, settings] = await Promise.all([
        getTranslations("faq"),
        getSiteSettings(),
    ]);
    return {
        title: `${t("title")} — ${settings.siteName}`,
        robots: { index: true, follow: true },
    };
}

export default async function FaqPage() {
    const t = await getTranslations("faq");
    const items = t.raw("items") as FaqItem[];

    return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                {t("title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
                {t("intro")}
            </p>

            <Accordion type="single" collapsible className="mt-10">
                {items.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>
    );
}
