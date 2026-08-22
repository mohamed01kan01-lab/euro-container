"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";

export function LocaleSwitcher() {
    const activeLocale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    return (
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 text-xs font-medium">
            {routing.locales.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    aria-current={locale === activeLocale}
                    onClick={() => router.push(pathname, { locale })}
                    className={
                        locale === activeLocale
                            ? "rounded-md bg-background px-2 py-1 shadow-sm"
                            : "rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
                    }
                >
                    {locale.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
