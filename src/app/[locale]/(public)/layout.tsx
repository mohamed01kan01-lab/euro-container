import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { ContactFab } from "@/components/public/contact-fab";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const [settings, t] = await Promise.all([getSiteSettings(), getTranslations("contactWidget")]);

    return (
        <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <ContactFab
                phone={settings.phone}
                email={settings.contactEmail}
                labels={{
                    open: t("open"),
                    close: t("close"),
                    title: t("title"),
                    subtitle: t("subtitle"),
                    whatsapp: t("whatsapp"),
                    whatsappHint: t("whatsappHint"),
                    email: t("email"),
                    message: t("message", { siteName: settings.siteName }),
                }}
            />
        </div>
    );
}
