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
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { MediaInput } from "@/components/admin/media/media-input";
import { formatIban, isValidBic, isValidIban, normalizeBic, normalizeIban } from "@/lib/bank";

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

/**
 * Réglages = données de configuration, jamais des données personnelles : aucune
 * suggestion du navigateur ni des gestionnaires de mots de passe (1Password,
 * LastPass, Bitwarden ont chacun leur attribut d'exclusion).
 */
const NO_FILL = {
    autoComplete: "off",
    spellCheck: false,
    "data-1p-ignore": true,
    "data-lpignore": "true",
    "data-bwignore": true,
    "data-form-type": "other",
} as const;

function NoFillInput(props: React.ComponentProps<typeof Input>) {
    return <Input {...NO_FILL} {...props} />;
}

function NoFillTextarea(props: React.ComponentProps<typeof Textarea>) {
    return <Textarea {...NO_FILL} {...props} />;
}

function SecretInput({
    id,
    placeholder,
    ...props
}: React.ComponentProps<"input"> & { id: string }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <NoFillInput
                id={id}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                className="pr-10"
                {...props}
                // Chrome ignore "off" sur un champ mot de passe ; "new-password" bloque le remplissage.
                autoComplete="new-password"
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

async function save(data: Record<string, string | number | boolean | null | undefined>) {
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
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow id="siteName" label="Nom du site" error={errors.siteName?.message}>
                <NoFillInput id="siteName" {...register("siteName")} />
            </FieldRow>
            <FieldRow id="siteDescription" label="Description" error={errors.siteDescription?.message}>
                <NoFillTextarea id="siteDescription" rows={2} {...register("siteDescription")} />
            </FieldRow>
            <FieldRow id="siteSlogan" label="Slogan">
                <NoFillInput id="siteSlogan" {...register("siteSlogan")} />
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
                <NoFillInput id="contactEmail" type="email" {...register("contactEmail")} />
            </FieldRow>
            <FieldRow id="phone" label="Téléphone">
                <NoFillInput id="phone" {...register("phone")} />
            </FieldRow>
            <FieldRow id="address" label="Adresse">
                <NoFillTextarea id="address" rows={2} {...register("address")} />
            </FieldRow>
            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: SEO ─────────────────────────────────────────────────────────────────

const seoSchema = z.object({
    seoTitle: z.string().max(60, "Max 60 caractères").optional(),
    seoDescription: z.string().max(160, "Max 160 caractères").optional(),
});
type SeoValues = z.infer<typeof seoSchema>;

function TabSeo({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SeoValues>({
        resolver: zodResolver(seoSchema),
        defaultValues: {
            seoTitle: s.seoTitle ?? "",
            seoDescription: s.seoDescription ?? "",
        },
    });

    const seoTitle = watch("seoTitle") ?? "";
    const seoDesc = watch("seoDescription") ?? "";

    const onSubmit = async (data: SeoValues) => {
        try {
            await save({
                seoTitle: data.seoTitle || null,
                seoDescription: data.seoDescription || null,
            });
            toast.success("Réglages SEO mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            <FieldRow
                id="seoTitle"
                label="Titre par défaut"
                hint={`${seoTitle.length}/60 caractères`}
                error={errors.seoTitle?.message}
            >
                <NoFillInput id="seoTitle" {...register("seoTitle")} />
            </FieldRow>
            <FieldRow
                id="seoDescription"
                label="Meta description par défaut"
                hint={`${seoDesc.length}/160 caractères`}
                error={errors.seoDescription?.message}
            >
                <NoFillTextarea id="seoDescription" rows={3} {...register("seoDescription")} />
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
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
            {SOCIAL_FIELDS.map(({ key, label, icon, placeholder }) => (
                <FieldRow key={key} id={key} label={label} error={errors[key]?.message}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {icon}
                        </span>
                        <NoFillInput
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

// ─── Tab: Intégrations ────────────────────────────────────────────────────────

const integrationsSchema = z.object({
    cloudinaryCloudName: z.string().optional(),
    cloudinaryApiKey: z.string().optional(),
    cloudinaryApiSecret: z.string().optional(),
});
type IntegrationsValues = z.infer<typeof integrationsSchema>;

function TabIntegrations({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, formState: { isSubmitting } } = useForm<IntegrationsValues>({
        resolver: zodResolver(integrationsSchema),
        defaultValues: {
            cloudinaryCloudName: s.cloudinaryCloudName ?? "",
            cloudinaryApiKey: s.cloudinaryApiKey ?? "",
            cloudinaryApiSecret: s.cloudinaryApiSecret ?? "",
        },
    });

    const onSubmit = async (data: IntegrationsValues) => {
        try {
            await save({
                cloudinaryCloudName: data.cloudinaryCloudName || null,
                cloudinaryApiKey: data.cloudinaryApiKey || null,
                cloudinaryApiSecret: data.cloudinaryApiSecret || null,
            });
            toast.success("Intégrations mises à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <section>
                <h2 className="text-sm font-semibold mb-3">Cloudinary</h2>
                <div className="space-y-4">
                    <FieldRow id="cloudinaryCloudName" label="Cloud Name">
                        <NoFillInput id="cloudinaryCloudName" {...register("cloudinaryCloudName")} />
                    </FieldRow>
                    <FieldRow id="cloudinaryApiKey" label="API Key">
                        <SecretInput id="cloudinaryApiKey" {...register("cloudinaryApiKey")} />
                    </FieldRow>
                    <FieldRow id="cloudinaryApiSecret" label="API Secret">
                        <SecretInput id="cloudinaryApiSecret" {...register("cloudinaryApiSecret")} />
                    </FieldRow>
                </div>
            </section>

            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Tab: Paiements ───────────────────────────────────────────────────────────

const paymentsSchema = z
    .object({
        stripePublicKey: z.string().trim().refine((v) => !v || v.startsWith("pk_"), "Doit commencer par pk_"),
        stripeSecretKey: z.string().trim().refine((v) => !v || v.startsWith("sk_") || v.startsWith("rk_"), "Doit commencer par sk_"),
        stripeWebhookSecret: z.string().trim().refine((v) => !v || v.startsWith("whsec_"), "Doit commencer par whsec_"),
        bankTransferEnabled: z.boolean(),
        bankAccountHolder: z.string().trim(),
        bankHolderAddress: z.string().trim(),
        bankIban: z.string().trim().refine((v) => !v || isValidIban(v), "IBAN invalide (clé de contrôle incorrecte)"),
        bankBic: z.string().trim().refine((v) => !v || isValidBic(v), "BIC invalide : 8 ou 11 caractères"),
        bankName: z.string().trim(),
        bankAddress: z.string().trim(),
        paymentDueDays: z.number({ error: "Nombre requis" }).int().min(1, "Minimum 1 jour").max(60, "Maximum 60 jours"),
        bankTransferDetails: z.string().optional(),
    })
    .superRefine((v, ctx) => {
        if (!v.bankTransferEnabled) return;
        if (!v.bankAccountHolder) ctx.addIssue({ code: "custom", path: ["bankAccountHolder"], message: "Requis pour proposer le virement" });
        if (!v.bankIban) ctx.addIssue({ code: "custom", path: ["bankIban"], message: "Requis pour proposer le virement" });
        if (!v.bankBic) ctx.addIssue({ code: "custom", path: ["bankBic"], message: "Requis : de nombreuses banques l'exigent" });
    });
type PaymentsValues = z.infer<typeof paymentsSchema>;

function TabPayments({ s }: { s: SiteSettings }) {
    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PaymentsValues>({
        resolver: zodResolver(paymentsSchema),
        defaultValues: {
            stripePublicKey: s.stripePublicKey ?? "",
            stripeSecretKey: s.stripeSecretKey ?? "",
            stripeWebhookSecret: s.stripeWebhookSecret ?? "",
            bankTransferEnabled: s.bankTransferEnabled,
            bankAccountHolder: s.bankAccountHolder ?? "",
            bankHolderAddress: s.bankHolderAddress ?? "",
            bankIban: s.bankIban ? formatIban(s.bankIban) : "",
            bankBic: s.bankBic ?? "",
            bankName: s.bankName ?? "",
            bankAddress: s.bankAddress ?? "",
            paymentDueDays: s.paymentDueDays,
            bankTransferDetails: s.bankTransferDetails ?? "",
        },
    });

    const bankTransferEnabled = watch("bankTransferEnabled");
    const secretKey = watch("stripeSecretKey");
    const stripeMode = secretKey?.startsWith("sk_live_") ? "live" : secretKey?.startsWith("sk_test_") ? "test" : null;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/stripe/webhook`;

    const onSubmit = async (data: PaymentsValues) => {
        try {
            await save({
                stripePublicKey: data.stripePublicKey || null,
                stripeSecretKey: data.stripeSecretKey || null,
                stripeWebhookSecret: data.stripeWebhookSecret || null,
                bankTransferEnabled: data.bankTransferEnabled,
                bankAccountHolder: data.bankAccountHolder || null,
                bankHolderAddress: data.bankHolderAddress || null,
                bankIban: data.bankIban ? normalizeIban(data.bankIban) : null,
                bankBic: data.bankBic ? normalizeBic(data.bankBic) : null,
                bankName: data.bankName || null,
                bankAddress: data.bankAddress || null,
                paymentDueDays: data.paymentDueDays,
                bankTransferDetails: data.bankTransferDetails || null,
            });
            toast.success("Paiements mis à jour");
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    return (
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <section>
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-sm font-semibold">Carte bancaire (Stripe)</h2>
                    {stripeMode && (
                        <span className={stripeMode === "live" ? "rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700" : "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700"}>
                            {stripeMode === "live" ? "Mode production" : "Mode test"}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    Proposée au checkout dès que les deux clés sont renseignées. En mode test (clés sk_test_),
                    payez avec la carte 4242 4242 4242 4242, date future, CVC quelconque.
                </p>
                <div className="space-y-4">
                    <FieldRow id="stripePublicKey" label="Clé publique" hint="Commence par pk_" error={errors.stripePublicKey?.message}>
                        <NoFillInput id="stripePublicKey" {...register("stripePublicKey")} />
                    </FieldRow>
                    <FieldRow id="stripeSecretKey" label="Clé secrète" hint="Commence par sk_" error={errors.stripeSecretKey?.message}>
                        <SecretInput id="stripeSecretKey" {...register("stripeSecretKey")} />
                    </FieldRow>
                    <FieldRow
                        id="stripeWebhookSecret"
                        label="Webhook secret"
                        hint={`Endpoint à créer dans Stripe : ${webhookUrl} (événements checkout.session.completed et checkout.session.async_payment_succeeded)`}
                        error={errors.stripeWebhookSecret?.message}
                    >
                        <SecretInput id="stripeWebhookSecret" {...register("stripeWebhookSecret")} />
                    </FieldRow>
                </div>
            </section>

            <Separator />

            <section>
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold">Virement bancaire</h2>
                    <Switch
                        id="bankTransferEnabled"
                        checked={bankTransferEnabled}
                        onCheckedChange={(v) => setValue("bankTransferEnabled", v, { shouldValidate: true })}
                        aria-label="Activer le virement"
                    />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    Affichées au client avec un bouton copier par champ et un QR code SEPA. Titulaire, BIC et adresses
                    sont exigés par les banques pour les virements internationaux.
                </p>
                <div className="space-y-4">
                    <FieldRow id="bankAccountHolder" label="Titulaire du compte (bénéficiaire)" hint="Raison sociale exacte, telle qu'enregistrée par la banque" error={errors.bankAccountHolder?.message}>
                        <NoFillInput id="bankAccountHolder" {...register("bankAccountHolder")} />
                    </FieldRow>
                    <FieldRow id="bankHolderAddress" label="Adresse du titulaire" error={errors.bankHolderAddress?.message}>
                        <NoFillTextarea id="bankHolderAddress" rows={2} className="resize-none" {...register("bankHolderAddress")} />
                    </FieldRow>
                    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                        <FieldRow id="bankIban" label="IBAN" error={errors.bankIban?.message}>
                            <NoFillInput
                                id="bankIban"
                                className="font-mono"
                                {...register("bankIban", {
                                    onChange: (e) => setValue("bankIban", formatIban(e.target.value)),
                                })}
                            />
                        </FieldRow>
                        <FieldRow id="bankBic" label="BIC / SWIFT" error={errors.bankBic?.message}>
                            <NoFillInput id="bankBic" className="font-mono uppercase" {...register("bankBic")} />
                        </FieldRow>
                    </div>
                    <FieldRow id="bankName" label="Nom de la banque" error={errors.bankName?.message}>
                        <NoFillInput id="bankName" {...register("bankName")} />
                    </FieldRow>
                    <FieldRow id="bankAddress" label="Adresse de la banque (agence)" error={errors.bankAddress?.message}>
                        <NoFillTextarea id="bankAddress" rows={2} className="resize-none" {...register("bankAddress")} />
                    </FieldRow>
                    <FieldRow
                        id="paymentDueDays"
                        label="Délai de réservation (jours)"
                        hint="Durée annoncée au client pendant laquelle sa commande reste réservée en attendant le virement"
                        error={errors.paymentDueDays?.message}
                    >
                        <NoFillInput id="paymentDueDays" type="number" min={1} max={60} className="w-28" {...register("paymentDueDays", { valueAsNumber: true })} />
                    </FieldRow>
                    <FieldRow id="bankTransferDetails" label="Instructions complémentaires" hint="Facultatif, affiché sous les coordonnées (ex. délai de traitement)">
                        <NoFillTextarea id="bankTransferDetails" rows={3} className="resize-none" {...register("bankTransferDetails")} />
                    </FieldRow>
                </div>
            </section>

            <SaveButton loading={isSubmitting} />
        </form>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Onglets volontairement absents (champs conservés en base) : Tracking, aucun
 * script n'est branché sur le site public ; Avancé, la devise est fixée à EUR,
 * la langue est gérée par next-intl et le mode maintenance n'est pas branché.
 */
const TABS = [
    { value: "general", label: "Général", Tab: TabGeneral },
    { value: "payments", label: "Paiements", Tab: TabPayments },
    { value: "seo", label: "SEO", Tab: TabSeo },
    { value: "social", label: "Réseaux sociaux", Tab: TabSocial },
    { value: "integrations", label: "Intégrations", Tab: TabIntegrations },
] as const;

export function SettingsTabs({ settings }: { settings: SiteSettings }) {
    return (
        <Tabs defaultValue="general">
            <TabsList className="h-auto flex-wrap gap-1 rounded-full p-1">
                {TABS.map(({ value, label }) => (
                    <TabsTrigger key={value} value={value} className="rounded-full px-4">
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>

            {TABS.map(({ value, Tab }) => (
                <TabsContent key={value} value={value} className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
                    <Tab s={settings} />
                </TabsContent>
            ))}
        </Tabs>
    );
}
