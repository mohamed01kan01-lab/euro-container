import { getTranslations } from "next-intl/server";
import { IconShoppingCart } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getCartCount } from "@/lib/cart";
import { Logo } from "@/components/public/logo";
import { LocaleSwitcher } from "@/components/public/locale-switcher";
import { MobileNav } from "@/components/public/mobile-nav";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const [settings, cartCount, tNav, tFooter] = await Promise.all([
        getSiteSettings(),
        getCartCount(),
        getTranslations("nav"),
        getTranslations("footer"),
    ]);

    const navLinks = [
        { href: "/shop", label: tNav("shop") },
        { href: "/blog", label: tNav("blog") },
        { href: "/about", label: tNav("about") },
        { href: "/faq", label: tNav("faq") },
        { href: "/contact", label: tNav("contact") },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="hover:text-primary transition-colors truncate"
                    >
                        <Logo siteName={settings.siteName} logoUrl={settings.logo} />
                    </Link>
                    <nav
                        aria-label={tNav("main")}
                        className="hidden items-center gap-5 md:flex"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1">
                        <div className="hidden md:block">
                            <LocaleSwitcher />
                        </div>

                        <Link
                            href="/cart"
                            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={
                                cartCount > 0
                                    ? tNav("cartAriaWithItems", { count: cartCount })
                                    : tNav("cartAriaEmpty")
                            }
                        >
                            <IconShoppingCart size={19} />
                            {cartCount > 0 && (
                                <span
                                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-semibold text-white"
                                    aria-hidden
                                >
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>

                        <MobileNav links={navLinks} menuLabel={tNav("main")} />
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-border bg-muted/30 py-8">
                <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
                    <nav
                        aria-label={tFooter("about")}
                        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
                    >
                        <Link
                            href="/about"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("about")}
                        </Link>
                        <Link
                            href="/faq"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("faq")}
                        </Link>
                        <Link
                            href="/returns"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("returns")}
                        </Link>
                        <Link
                            href="/shipping"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("shipping")}
                        </Link>
                        <Link
                            href="/terms"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("terms")}
                        </Link>
                        <Link
                            href="/contact"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {tFooter("contact")}
                        </Link>
                    </nav>

                    <div className="space-y-1">
                        <p className="text-sm font-semibold">{settings.siteName}</p>
                        {settings.slogan && (
                            <p className="text-xs text-muted-foreground">{settings.slogan}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {tFooter("copyright", {
                                year: new Date().getFullYear(),
                                siteName: settings.siteName,
                            })}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
