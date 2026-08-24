import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IconMail, IconPhone, IconMapPin } from "@tabler/icons-react";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { mapEmbedUrl } from "@/lib/maps";
import { ContactForm } from "@/components/public/contact-form";

export async function generateMetadata(): Promise<Metadata> {
    const [t, settings] = await Promise.all([
        getTranslations("contact"),
        getSiteSettings(),
    ]);
    return {
        title: `${t("title")} — ${settings.siteName}`,
        robots: { index: true, follow: true },
    };
}

export default async function ContactPage() {
    const [t, settings] = await Promise.all([
        getTranslations("contact"),
        getSiteSettings(),
    ]);

    return (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
                {t("intro")}
            </p>

            <div className="mt-10 grid gap-6 lg:grid-cols-[3fr_2fr]">
                <ContactForm
                    title={t("formTitle")}
                    nameLabel={t("formName")}
                    emailLabel={t("formEmail")}
                    subjectLabel={t("formSubjectOptional")}
                    messageLabel={t("formMessage")}
                    submitLabel={t("formSubmit")}
                    successTitle={t("formSuccessTitle")}
                    successBody={t("formSuccessBody")}
                    errorGeneric={t("formErrorGeneric")}
                />

                <div className="flex flex-col gap-4">
                    {settings.contactEmail && (
                        <a
                            href={`mailto:${settings.contactEmail}`}
                            className="flex items-start gap-4 rounded-[24px] border border-border bg-card p-5 transition-colors hover:border-primary/30"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <IconMail size={20} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold">{t("email")}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {settings.contactEmail}
                                </p>
                            </div>
                        </a>
                    )}

                    {settings.phone && (
                        <a
                            href={`tel:${settings.phone}`}
                            className="flex items-start gap-4 rounded-[24px] border border-border bg-card p-5 transition-colors hover:border-primary/30"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <IconPhone size={20} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold">{t("phone")}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {settings.phone}
                                </p>
                            </div>
                        </a>
                    )}

                    {settings.address && (
                        <div className="flex items-start gap-4 rounded-[24px] border border-border bg-card p-5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <IconMapPin size={20} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold">{t("address")}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {settings.address}
                                </p>
                            </div>
                        </div>
                    )}

                    {settings.address && (
                        <div className="overflow-hidden rounded-[24px] border border-border">
                            <iframe
                                src={mapEmbedUrl(settings.address)}
                                title={t("address")}
                                className="h-56 w-full"
                                loading="lazy"
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
