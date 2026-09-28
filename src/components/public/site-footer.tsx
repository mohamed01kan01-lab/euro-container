import { getTranslations } from "next-intl/server";
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
    IconMail,
    IconMapPin,
    IconPhone,
} from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { Logo } from "@/components/public/logo";

export async function SiteFooter() {
    const [settings, tNav, tFooter] = await Promise.all([
        getSiteSettings(),
        getTranslations("nav"),
        getTranslations("footer"),
    ]);

    const navLinks = [
        { href: "/shop", label: tNav("shop") },
        { href: "/blog", label: tNav("blog") },
        { href: "/contact", label: tNav("contact") },
        { href: "/orders", label: tNav("myOrders") },
    ];

    const legalLinks = [
        { href: "/about", label: tFooter("about") },
        { href: "/faq", label: tFooter("faq") },
        { href: "/returns", label: tFooter("returns") },
        { href: "/shipping", label: tFooter("shipping") },
        { href: "/terms", label: tFooter("terms") },
        { href: "/legal", label: tFooter("legal") },
        { href: "/privacy", label: tFooter("privacy") },
    ];

    const socialLinks = [
        { url: settings.socialFacebook, Icon: IconBrandFacebook, label: "Facebook" },
        { url: settings.socialInstagram, Icon: IconBrandInstagram, label: "Instagram" },
        { url: settings.socialLinkedin, Icon: IconBrandLinkedin, label: "LinkedIn" },
        { url: settings.socialTwitter, Icon: IconBrandX, label: "X" },
        { url: settings.socialYoutube, Icon: IconBrandYoutube, label: "YouTube" },
        { url: settings.socialTiktok, Icon: IconBrandTiktok, label: "TikTok" },
    ].filter((s): s is typeof s & { url: string } => !!s.url);

    return (
        <footer className="border-t border-border bg-secondary/30">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <Logo siteName={settings.siteName} logoUrl={settings.logo} />
                        {settings.description && (
                            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                {settings.description}
                            </p>
                        )}
                        {socialLinks.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {socialLinks.map(({ url, Icon, label }) => (
                                    <a
                                        key={label}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-orange-600 hover:bg-orange-600/10 hover:text-orange-600"
                                    >
                                        <Icon size={16} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <FooterColumn title={tFooter("navTitle")} links={navLinks} />
                    <FooterColumn title={tFooter("legalTitle")} links={legalLinks} />

                    <div>
                        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider">
                            {tFooter("contactTitle")}
                        </h3>
                        <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
                            {settings.contactEmail && (
                                <a
                                    href={`mailto:${settings.contactEmail}`}
                                    className="flex items-center gap-2 transition-colors hover:text-foreground"
                                >
                                    <IconMail size={16} className="shrink-0 text-orange-600" />
                                    {settings.contactEmail}
                                </a>
                            )}
                            {settings.phone && (
                                <a
                                    href={`tel:${settings.phone}`}
                                    className="flex items-center gap-2 transition-colors hover:text-foreground"
                                >
                                    <IconPhone size={16} className="shrink-0 text-orange-600" />
                                    {settings.phone}
                                </a>
                            )}
                            {settings.address && (
                                <p className="flex items-start gap-2">
                                    <IconMapPin
                                        size={16}
                                        className="mt-0.5 shrink-0 text-orange-600"
                                    />
                                    {settings.address}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
                    {tFooter("copyright", {
                        year: new Date().getFullYear(),
                        siteName: settings.siteName,
                    })}
                    {settings.legalName && (
                        <p className="mt-1">
                            {[
                                [settings.legalName, settings.legalForm].filter(Boolean).join(" "),
                                settings.legalSiret && `SIRET ${settings.legalSiret}`,
                                settings.legalVatNumber && `TVA ${settings.legalVatNumber}`,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({
    title,
    links,
}: {
    title: string;
    links: { href: string; label: string }[];
}) {
    return (
        <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider">
                {title}
            </h3>
            <nav className="mt-4 flex flex-col gap-2.5">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
