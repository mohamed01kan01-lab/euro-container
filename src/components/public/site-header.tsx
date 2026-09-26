import { getLocale, getTranslations } from "next-intl/server";
import { IconShoppingCart } from "@tabler/icons-react";
import { Link, getPathname } from "@/i18n/routing";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { getCartCount } from "@/lib/cart";
import { Logo } from "@/components/public/logo";
import { LocaleSwitcher } from "@/components/public/locale-switcher";
import { MobileNav } from "@/components/public/mobile-nav";
import { HeaderSearch } from "@/components/public/header-search";
import { AccountMenu } from "@/components/public/account-menu";
import { ThemeToggle } from "@/components/public/theme-toggle";

export async function SiteHeader() {
    const [settings, cartCount, tNav, tHome, locale] = await Promise.all([
        getSiteSettings(),
        getCartCount(),
        getTranslations("nav"),
        getTranslations("home"),
        getLocale(),
    ]);
    const shopHref = getPathname({ href: "/shop", locale });

    const navLinks = [
        { href: "/shop", label: tNav("shop") },
        { href: "/blog", label: tNav("blog") },
        { href: "/about", label: tNav("about") },
        { href: "/faq", label: tNav("faq") },
        { href: "/contact", label: tNav("contact") },
    ];

    const themeLabels = {
        lightLabel: tNav("themeLight"),
        darkLabel: tNav("themeDark"),
    };

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
                <Link href="/" className="truncate transition-opacity hover:opacity-80">
                    <Logo siteName={settings.siteName} logoUrl={settings.logo} />
                </Link>

                <nav aria-label={tNav("main")} className="hidden items-center gap-6 md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group relative py-1 font-heading text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {link.label}
                            <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 bg-orange-600 transition-transform duration-200 group-hover:scale-x-100" />
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5">
                    <div className="hidden items-center gap-1.5 md:flex">
                        <LocaleSwitcher />
                        <ThemeToggle {...themeLabels} />
                    </div>

                    <HeaderSearch
                        action={shopHref}
                        placeholder={tHome("searchPlaceholder")}
                        menuLabel={tHome("searchCta")}
                    />

                    <AccountMenu
                        loginAria={tNav("loginAria")}
                        accountAria={tNav("accountAria")}
                        dashboardLabel={tNav("dashboard")}
                        logoutLabel={tNav("logout")}
                    />

                    {/* Desktop : icône discrète. */}
                    <Link
                        href="/cart"
                        className="relative hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:flex"
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

                    {/* Mobile : pilule pleine, esprit chez-charly. */}
                    <Link
                        href="/cart"
                        className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 md:hidden"
                        aria-label={
                            cartCount > 0
                                ? tNav("cartAriaWithItems", { count: cartCount })
                                : tNav("cartAriaEmpty")
                        }
                    >
                        <IconShoppingCart size={17} />
                        {cartCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white">
                                {cartCount > 99 ? "99+" : cartCount}
                            </span>
                        )}
                    </Link>

                    <MobileNav
                        links={navLinks}
                        menuLabel={tNav("main")}
                        themeLabels={themeLabels}
                    />
                </div>
            </div>
        </header>
    );
}
