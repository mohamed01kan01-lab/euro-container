"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";

export function LocaleSwitcher() {
    const activeLocale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    return (
        <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5 text-xs font-bold">
            {routing.locales.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    aria-current={locale === activeLocale}
                    onClick={() => router.push(pathname, { locale })}
                    className={
                        locale === activeLocale
                            ? "rounded-full bg-orange-600 px-2.5 py-1 text-white"
                            : "rounded-full px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
                    }
                >
                    {locale.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
