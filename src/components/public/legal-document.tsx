import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { fillLegal, legalVars } from "@/lib/legal";

interface LegalSection {
    title: string;
    paragraphs?: string[];
    list?: string[];
}

export type LegalDocKey = "notice" | "privacy" | "terms" | "returns" | "shipping";

export async function legalMetadata(doc: LegalDocKey): Promise<Metadata> {
    const [t, settings] = await Promise.all([getTranslations("legal"), getSiteSettings()]);
    return {
        title: `${t(`${doc}.title`)} — ${settings.siteName}`,
        robots: { index: true, follow: true },
    };
}

/**
 * Page de texte légal : sections lues dans messages/*.json (legal.<doc>),
 * variables remplies depuis les réglages (raison sociale, SIRET, délai de
 * réservation, taux de TVA…).
 */
export async function LegalDocument({ doc, draft = true }: { doc: LegalDocKey; draft?: boolean }) {
    const [t, settings] = await Promise.all([getTranslations("legal"), getSiteSettings()]);
    const vars = legalVars(settings);
    const todo = t("todo");
    const fill = (text: string) => fillLegal(text, vars, todo);
    const sections = t.raw(`${doc}.sections`) as LegalSection[];

    return (
        <article className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{t(`${doc}.title`)}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
                {t("updated")}
                {draft && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{t("draftNotice")}</span>}
            </p>

            <div className="mt-10 space-y-8">
                {sections.map((section) => (
                    <section key={section.title} className="space-y-3">
                        <h2 className="font-display text-xl">{section.title}</h2>
                        {section.paragraphs?.map((p, i) => (
                            <p key={i} className="whitespace-pre-line leading-relaxed text-muted-foreground text-pretty">
                                {fill(p)}
                            </p>
                        ))}
                        {section.list && (
                            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
                                {section.list.map((item, i) => (
                                    <li key={i}>{fill(item)}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>
        </article>
    );
}
