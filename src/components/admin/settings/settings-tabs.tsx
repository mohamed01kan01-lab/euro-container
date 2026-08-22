"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { SiteSettings } from "@prisma/client";
import {
    IconLoader2,
    IconEye,
    IconEyeOff,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { MediaInput } from "@/components/admin/media/media-input";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FieldRow({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function SecretInput({
    id,
    placeholder,
    ...props
}: React.ComponentProps<"input"> & { id: string }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <Input
                id={id}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                className="pr-10"
                autoComplete="off"
                {...props}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={visible ? "Masquer" : "Afficher"}
            >
                {visible ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </button>
        </div>
    );
}

function SaveButton({ loading }: { loading: boolean }) {
    return (
        <Button type="submit" disabled={loading} className="mt-2">
            {loading && <IconLoader2 size={16} className="mr-2 animate-spin" />}
            Enregistrer
        </Button>
    );
}

async function save(data: Record<string, string | boolean | null | undefined>) {
    await updateSiteSettings(data);
}

// ─── Tab: Général ─────────────────────────────────────────────────────────────

const generalSchema = z.object({
    siteName: z.string().min(1, "Requis"),
    siteDescription: z.string().optional(),
    siteSlogan: z.string().optional(),
    logoUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    faviconUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    contactEmail: z.email({ error: "Email invalide" }).optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
});
type GeneralValues = z.infer<typeof generalSchema>;

function TabGeneral({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<GeneralValues>({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            siteName: s.siteName,
            siteDescription: s.description ?? "",
            siteSlogan: s.slogan ?? "",
            logoUrl: s.logo ?? "",
            faviconUrl: s.favicon ?? "",
            contactEmail: s.contactEmail ?? "",
            phone: s.phone ?? "",
            address: s.address ?? "",
        },
    });

    const onSubmit = async (data: GeneralValues) => {
        try {
            await save({
                siteName: data.siteName,
                description: data.siteDescription || null,
                slogan: data.siteSlogan || null,
                logo: data.logoUrl || null,
                favicon: data.faviconUrl || null,
                contactEmail: data.contactEmail || null,
                phone: data.phone || null,
                address: data.address || null,
            });
            toast.success("Réglages généraux mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow id="siteName" label="Nom du site" error={errors.siteName?.message}>
                <Input id="siteName" {...register("siteName")} />
            </FieldRow>
            <FieldRow id="siteDescription" label="Description" error={errors.siteDescription?.message}>
                <Textarea id="siteDescription" rows={2} {...register("siteDescription")} />
            </FieldRow>
            <FieldRow id="siteSlogan" label="Slogan">
                <Input id="siteSlogan" {...register("siteSlogan")} />
            </FieldRow>
            <FieldRow id="logoUrl" label="URL du logo" hint="URL externe ou Cloudinary" error={errors.logoUrl?.message}>
                <MediaInput
                    id="logoUrl"
                    value={watch("logoUrl") ?? ""}
                    onChange={(url) => setValue("logoUrl", url, { shouldDirty: true, shouldValidate: true })}
                    accept="image"
                    previewAspectClass="aspect-video"
                />
            </FieldRow>
            <FieldRow id="faviconUrl" label="URL du favicon" error={errors.faviconUrl?.message}>
                <MediaInput
                    id="faviconUrl"
                    value={watch("faviconUrl") ?? ""}
                    onChange={(url) => setValue("faviconUrl", url, { shouldDirty: true, shouldValidate: true })}
                    accept="image"
                    previewAspectClass="aspect-square"
                />
            </FieldRow>
            <Separator />
            <FieldRow id="contactEmail" label="Email de contact" error={errors.contactEmail?.message}>
                <Input id="contactEmail" type="email" {...register("contactEmail")} />
            </FieldRow>
            <FieldRow id="phone" label="Téléphone">
                <Input id="phone" {...register("phone")} />
            </FieldRow>
            <FieldRow id="address" label="Adresse">
                <Textarea id="address" rows={2} {...register("address")} />
            </FieldRow>
            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: SEO ─────────────────────────────────────────────────────────────────

const seoSchema = z.object({
    seoTitle: z.string().max(60, "Max 60 caractères").optional(),
    seoDescription: z.string().max(160, "Max 160 caractères").optional(),
    robotsTxt: z.string().optional(),
});
type SeoValues = z.infer<typeof seoSchema>;

function TabSeo({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SeoValues>({
        resolver: zodResolver(seoSchema),
        defaultValues: {
            seoTitle: s.seoTitle ?? "",
            seoDescription: s.seoDescription ?? "",
            robotsTxt: s.robotsTxt ?? "",
        },
    });

    const seoTitle = watch("seoTitle") ?? "";
    const seoDesc = watch("seoDescription") ?? "";

    const onSubmit = async (data: SeoValues) => {
        try {
            await save({
                seoTitle: data.seoTitle || null,
                seoDescription: data.seoDescription || null,
                robotsTxt: data.robotsTxt || null,
            });
            toast.success("Réglages SEO mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow
                id="seoTitle"
                label="Titre par défaut"
                hint={`${seoTitle.length}/60 caractères`}
                error={errors.seoTitle?.message}
            >
                <Input id="seoTitle" {...register("seoTitle")} />
            </FieldRow>
            <FieldRow
                id="seoDescription"
                label="Meta description par défaut"
                hint={`${seoDesc.length}/160 caractères`}
                error={errors.seoDescription?.message}
            >
                <Textarea id="seoDescription" rows={3} {...register("seoDescription")} />
            </FieldRow>
            <FieldRow id="robotsTxt" label="robots.txt" hint="Contenu personnalisé du fichier robots.txt">
                <Textarea id="robotsTxt" rows={6} className="font-mono text-xs" {...register("robotsTxt")} />
            </FieldRow>
            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: Réseaux sociaux ─────────────────────────────────────────────────────

const socialSchema = z.object({
    socialFacebook: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    socialTwitter: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    socialInstagram: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    socialLinkedin: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    socialYoutube: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
    socialTiktok: z.string().url({ message: "URL invalide" }).optional().or(z.literal("")),
});
type SocialValues = z.infer<typeof socialSchema>;

const SOCIAL_FIELDS: { key: keyof SocialValues; label: string; icon: React.ReactNode; placeholder: string }[] = [
    { key: "socialFacebook", label: "Facebook", icon: <IconBrandFacebook size={16} />, placeholder: "https://facebook.com/…" },
    { key: "socialTwitter", label: "X / Twitter", icon: <IconBrandX size={16} />, placeholder: "https://x.com/…" },
    { key: "socialInstagram", label: "Instagram", icon: <IconBrandInstagram size={16} />, placeholder: "https://instagram.com/…" },
    { key: "socialLinkedin", label: "LinkedIn", icon: <IconBrandLinkedin size={16} />, placeholder: "https://linkedin.com/…" },
    { key: "socialYoutube", label: "YouTube", icon: <IconBrandYoutube size={16} />, placeholder: "https://youtube.com/…" },
    { key: "socialTiktok", label: "TikTok", icon: <IconBrandTiktok size={16} />, placeholder: "https://tiktok.com/…" },
];

function TabSocial({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SocialValues>({
        resolver: zodResolver(socialSchema),
        defaultValues: {
            socialFacebook: s.socialFacebook ?? "",
            socialTwitter: s.socialTwitter ?? "",
            socialInstagram: s.socialInstagram ?? "",
            socialLinkedin: s.socialLinkedin ?? "",
            socialYoutube: s.socialYoutube ?? "",
            socialTiktok: s.socialTiktok ?? "",
        },
    });

    const onSubmit = async (data: SocialValues) => {
        try {
            await save({
                socialFacebook: data.socialFacebook || null,
                socialTwitter: data.socialTwitter || null,
                socialInstagram: data.socialInstagram || null,
                socialLinkedin: data.socialLinkedin || null,
                socialYoutube: data.socialYoutube || null,
                socialTiktok: data.socialTiktok || null,
            });
            toast.success("Réseaux sociaux mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            {SOCIAL_FIELDS.map(({ key, label, icon, placeholder }) => (
                <FieldRow key={key} id={key} label={label} error={errors[key]?.message}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {icon}
                        </span>
                        <Input
                            id={key}
                            placeholder={placeholder}
                            className="pl-9"
                            {...register(key)}
                        />
                    </div>
                </FieldRow>
            ))}
            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: Tracking ────────────────────────────────────────────────────────────

const trackingSchema = z.object({
    gtmId: z.string().optional(),
    ga4Id: z.string().optional(),
    metaPixelId: z.string().optional(),
    tiktokPixelId: z.string().optional(),
    metaCapiToken: z.string().optional(),
    googleEnhancedConv: z.string().optional(),
});
type TrackingValues = z.infer<typeof trackingSchema>;

function TabTracking({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, formState: { isSubmitting } } = useForm<TrackingValues>({
        resolver: zodResolver(trackingSchema),
        defaultValues: {
            gtmId: s.gtmId ?? "",
            ga4Id: s.ga4Id ?? "",
            metaPixelId: s.metaPixelId ?? "",
            tiktokPixelId: s.tiktokPixelId ?? "",
            metaCapiToken: s.metaCapiToken ?? "",
            googleEnhancedConv: s.googleEnhancedConv ?? "",
        },
    });

    const onSubmit = async (data: TrackingValues) => {
        try {
            await save({
                gtmId: data.gtmId || null,
                ga4Id: data.ga4Id || null,
                metaPixelId: data.metaPixelId || null,
                tiktokPixelId: data.tiktokPixelId || null,
                metaCapiToken: data.metaCapiToken || null,
                googleEnhancedConv: data.googleEnhancedConv || null,
            });
            toast.success("Tracking mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow id="gtmId" label="Google Tag Manager ID" hint="Format : GTM-XXXXXXX">
                <Input id="gtmId" placeholder="GTM-XXXXXXX" {...register("gtmId")} />
            </FieldRow>
            <FieldRow id="ga4Id" label="Google Analytics 4 ID" hint="Format : G-XXXXXXXXXX">
                <Input id="ga4Id" placeholder="G-XXXXXXXXXX" {...register("ga4Id")} />
            </FieldRow>
            <FieldRow id="metaPixelId" label="Meta Pixel ID">
                <Input id="metaPixelId" placeholder="1234567890" {...register("metaPixelId")} />
            </FieldRow>
            <FieldRow id="tiktokPixelId" label="TikTok Pixel ID">
                <Input id="tiktokPixelId" placeholder="CXXXXXXXXXXXXXXXX" {...register("tiktokPixelId")} />
            </FieldRow>
            <Separator />
            <FieldRow id="metaCapiToken" label="Meta CAPI Access Token" hint="Clé serveur — jamais exposée côté client">
                <SecretInput id="metaCapiToken" placeholder="EAA…" {...register("metaCapiToken")} />
            </FieldRow>
            <FieldRow id="googleEnhancedConv" label="Google Enhanced Conversions" hint="Conversion ID Google Ads">
                <Input id="googleEnhancedConv" placeholder="AW-XXXXXXXXXX" {...register("googleEnhancedConv")} />
            </FieldRow>
            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: Intégrations ────────────────────────────────────────────────────────

const integrationsSchema = z.object({
    cloudinaryCloudName: z.string().optional(),
    cloudinaryApiKey: z.string().optional(),
    cloudinaryApiSecret: z.string().optional(),
    stripePublicKey: z.string().optional(),
    stripeSecretKey: z.string().optional(),
    stripeWebhookSecret: z.string().optional(),
    feexpayPublicKey: z.string().optional(),
    feexpaySecretKey: z.string().optional(),
    deeplApiKey: z.string().optional(),
    codEnabled: z.boolean(),
    bankTransferEnabled: z.boolean(),
    bankTransferDetails: z.string().optional(),
    mobileMoneyEnabled: z.boolean(),
    mobileMoneyDetails: z.string().optional(),
});
type IntegrationsValues = z.infer<typeof integrationsSchema>;

function TabIntegrations({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<IntegrationsValues>({
        resolver: zodResolver(integrationsSchema),
        defaultValues: {
            cloudinaryCloudName: s.cloudinaryCloudName ?? "",
            cloudinaryApiKey: s.cloudinaryApiKey ?? "",
            cloudinaryApiSecret: s.cloudinaryApiSecret ?? "",
            stripePublicKey: s.stripePublicKey ?? "",
            stripeSecretKey: s.stripeSecretKey ?? "",
            stripeWebhookSecret: s.stripeWebhookSecret ?? "",
            feexpayPublicKey: s.feexpayPublicKey ?? "",
            feexpaySecretKey: s.feexpaySecretKey ?? "",
            deeplApiKey: s.deeplApiKey ?? "",
            codEnabled: s.codEnabled,
            bankTransferEnabled: s.bankTransferEnabled,
            bankTransferDetails: s.bankTransferDetails ?? "",
            mobileMoneyEnabled: s.mobileMoneyEnabled,
            mobileMoneyDetails: s.mobileMoneyDetails ?? "",
        },
    });

    const codEnabled = watch("codEnabled");
    const bankTransferEnabled = watch("bankTransferEnabled");
    const mobileMoneyEnabled = watch("mobileMoneyEnabled");

    const onSubmit = async (data: IntegrationsValues) => {
        try {
            await save({
                cloudinaryCloudName: data.cloudinaryCloudName || null,
                cloudinaryApiKey: data.cloudinaryApiKey || null,
                cloudinaryApiSecret: data.cloudinaryApiSecret || null,
                stripePublicKey: data.stripePublicKey || null,
                stripeSecretKey: data.stripeSecretKey || null,
                stripeWebhookSecret: data.stripeWebhookSecret || null,
                feexpayPublicKey: data.feexpayPublicKey || null,
                feexpaySecretKey: data.feexpaySecretKey || null,
                deeplApiKey: data.deeplApiKey || null,
                codEnabled: data.codEnabled,
                bankTransferEnabled: data.bankTransferEnabled,
                bankTransferDetails: data.bankTransferDetails || null,
                mobileMoneyEnabled: data.mobileMoneyEnabled,
                mobileMoneyDetails: data.mobileMoneyDetails || null,
            });
            toast.success("Intégrations mises à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <section>
                <h2 className="text-sm font-semibold mb-3">Cloudinary</h2>
                <div className="space-y-4">
                    <FieldRow id="cloudinaryCloudName" label="Cloud Name">
                        <Input id="cloudinaryCloudName" {...register("cloudinaryCloudName")} />
                    </FieldRow>
                    <FieldRow id="cloudinaryApiKey" label="API Key">
                        <SecretInput id="cloudinaryApiKey" {...register("cloudinaryApiKey")} />
                    </FieldRow>
                    <FieldRow id="cloudinaryApiSecret" label="API Secret">
                        <SecretInput id="cloudinaryApiSecret" {...register("cloudinaryApiSecret")} />
                    </FieldRow>
                </div>
            </section>

            <Separator />

            <section>
                <h2 className="text-sm font-semibold mb-3">Stripe</h2>
                <div className="space-y-4">
                    <FieldRow id="stripePublicKey" label="Clé publique" hint="Commence par pk_">
                        <Input id="stripePublicKey" {...register("stripePublicKey")} />
                    </FieldRow>
                    <FieldRow id="stripeSecretKey" label="Clé secrète" hint="Commence par sk_">
                        <SecretInput id="stripeSecretKey" {...register("stripeSecretKey")} />
                    </FieldRow>
                    <FieldRow id="stripeWebhookSecret" label="Webhook secret" hint="Commence par whsec_">
                        <SecretInput id="stripeWebhookSecret" {...register("stripeWebhookSecret")} />
                    </FieldRow>
                </div>
            </section>

            <Separator />

            <section>
                <h2 className="text-sm font-semibold mb-3">FeexPay</h2>
                <div className="space-y-4">
                    <FieldRow id="feexpayPublicKey" label="Clé publique">
                        <Input id="feexpayPublicKey" {...register("feexpayPublicKey")} />
                    </FieldRow>
                    <FieldRow id="feexpaySecretKey" label="Clé secrète">
                        <SecretInput id="feexpaySecretKey" {...register("feexpaySecretKey")} />
                    </FieldRow>
                </div>
            </section>

            <Separator />

            <section>
                <h2 className="text-sm font-semibold mb-1">Paiements manuels</h2>
                <p className="text-xs text-muted-foreground mb-3">
                    Toujours proposés au client, y compris lorsque Stripe ou
                    FeexPay sont configurés.
                </p>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="codEnabled" className="font-normal">
                            Paiement à la livraison
                        </Label>
                        <Switch
                            id="codEnabled"
                            checked={codEnabled}
                            onCheckedChange={(v) => setValue("codEnabled", v)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="bankTransferEnabled" className="font-normal">
                            Virement bancaire
                        </Label>
                        <Switch
                            id="bankTransferEnabled"
                            checked={bankTransferEnabled}
                            onCheckedChange={(v) => setValue("bankTransferEnabled", v)}
                        />
                    </div>
                    {bankTransferEnabled && (
                        <FieldRow
                            id="bankTransferDetails"
                            label="Coordonnées bancaires"
                            hint="Affichées au client après commande"
                        >
                            <Textarea
                                id="bankTransferDetails"
                                rows={3}
                                className="resize-none"
                                {...register("bankTransferDetails")}
                            />
                        </FieldRow>
                    )}

                    <div className="flex items-center justify-between">
                        <Label htmlFor="mobileMoneyEnabled" className="font-normal">
                            Transfert Mobile Money
                        </Label>
                        <Switch
                            id="mobileMoneyEnabled"
                            checked={mobileMoneyEnabled}
                            onCheckedChange={(v) => setValue("mobileMoneyEnabled", v)}
                        />
                    </div>
                    {mobileMoneyEnabled && (
                        <FieldRow
                            id="mobileMoneyDetails"
                            label="Numéro et instructions"
                            hint="Affichés au client après commande"
                        >
                            <Textarea
                                id="mobileMoneyDetails"
                                rows={3}
                                className="resize-none"
                                {...register("mobileMoneyDetails")}
                            />
                        </FieldRow>
                    )}
                </div>
            </section>

            <Separator />

            <section>
                <h2 className="text-sm font-semibold mb-3">DeepL</h2>
                <FieldRow id="deeplApiKey" label="API Key">
                    <SecretInput id="deeplApiKey" {...register("deeplApiKey")} />
                </FieldRow>
            </section>

            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: Avancé ──────────────────────────────────────────────────────────────

const advancedSchema = z.object({
    currency: z.string().min(1),
    defaultLanguage: z.string().min(1),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().optional(),
});
type AdvancedValues = z.infer<typeof advancedSchema>;

const CURRENCIES = ["EUR", "USD", "XOF", "GBP", "CAD", "CHF", "MAD", "DZD", "TND"];
const LOCALES = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "ar", label: "العربية" },
];

function TabAdvanced({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<AdvancedValues>({
        resolver: zodResolver(advancedSchema),
        defaultValues: {
            currency: s.currency,
            defaultLanguage: s.defaultLanguage,
            maintenanceMode: s.maintenanceMode,
            maintenanceMessage: s.maintenanceMessage ?? "",
        },
    });

    const maintenanceMode = watch("maintenanceMode");

    const onSubmit = async (data: AdvancedValues) => {
        try {
            await save({
                currency: data.currency,
                defaultLanguage: data.defaultLanguage,
                maintenanceMode: data.maintenanceMode,
                maintenanceMessage: data.maintenanceMessage || null,
            });
            toast.success("Réglages avancés mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow id="currency" label="Devise par défaut">
                <Select
                    defaultValue={s.currency}
                    onValueChange={(v) => setValue("currency", v)}
                >
                    <SelectTrigger id="currency">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldRow>

            <FieldRow id="defaultLanguage" label="Langue par défaut">
                <Select
                    defaultValue={s.defaultLanguage}
                    onValueChange={(v) => setValue("defaultLanguage", v)}
                >
                    <SelectTrigger id="defaultLanguage">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LOCALES.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldRow>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">Mode maintenance</p>
                    <p className="text-xs text-muted-foreground">
                        Le site affiche une page de maintenance aux visiteurs
                    </p>
                </div>
                <Switch
                    checked={maintenanceMode}
                    onCheckedChange={(v) => setValue("maintenanceMode", v)}
                />
            </div>

            {maintenanceMode && (
                <FieldRow
                    id="maintenanceMessage"
                    label="Message de maintenance"
                    hint="Affiché aux visiteurs pendant la maintenance"
                >
                    <Textarea id="maintenanceMessage" rows={3} {...register("maintenanceMessage")} />
                </FieldRow>
            )}

            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SettingsTabs({ settings }: { settings: SiteSettings }) {
    return (
        <Tabs defaultValue="general">
            <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="social">Réseaux sociaux</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="integrations">Intégrations</TabsTrigger>
                <TabsTrigger value="advanced">Avancé</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
                <TabGeneral s={settings} />
            </TabsContent>
            <TabsContent value="seo" className="mt-6">
                <TabSeo s={settings} />
            </TabsContent>
            <TabsContent value="social" className="mt-6">
                <TabSocial s={settings} />
            </TabsContent>
            <TabsContent value="tracking" className="mt-6">
                <TabTracking s={settings} />
            </TabsContent>
            <TabsContent value="integrations" className="mt-6">
                <TabIntegrations s={settings} />
            </TabsContent>
            <TabsContent value="advanced" className="mt-6">
                <TabAdvanced s={settings} />
            </TabsContent>
        </Tabs>
    );
}
