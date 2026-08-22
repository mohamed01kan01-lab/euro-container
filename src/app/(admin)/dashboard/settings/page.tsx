import type { Metadata } from "next";
import { getSiteSettings } from "./actions";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
    const settings = await getSiteSettings();
    return (
        <section className="space-y-6">
            <PageHeader
                title="Réglages du site"
                description="Configurez votre site, les intégrations et les options avancées."
            />
            <SettingsTabs settings={settings} />
        </section>
    );
}
