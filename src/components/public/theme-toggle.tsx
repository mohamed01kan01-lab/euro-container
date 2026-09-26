"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeToggle({
    lightLabel,
    darkLabel,
}: {
    lightLabel: string;
    darkLabel: string;
}) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Le thème n'est connu que côté client : on réserve la place pour éviter un saut de layout.
    if (!mounted) return <span className="block h-10 w-10" aria-hidden />;

    const isDark = resolvedTheme === "dark";

    return (
        <button
            type="button"
            aria-label={isDark ? lightLabel : darkLabel}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
            {isDark ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>
    );
}
