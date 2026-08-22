type LogoProps = {
    siteName: string;
    logoUrl?: string | null;
    className?: string;
};

export function Logo({ siteName, logoUrl, className }: LogoProps) {
    if (logoUrl) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={logoUrl} alt={siteName} className={`h-8 w-auto ${className ?? ""}`} />;
    }

    return (
        <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
            <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
            >
                <rect x="1" y="15" width="11" height="11" rx="1.5" fill="currentColor" className="text-primary" />
                <rect
                    x="13.5"
                    y="15"
                    width="11"
                    height="11"
                    rx="1.5"
                    fill="currentColor"
                    className="text-primary/60"
                />
                <rect x="7" y="2" width="11" height="11" rx="1.5" fill="currentColor" className="text-orange-600" />
            </svg>
            <span className="font-heading font-bold text-lg tracking-tight leading-none truncate">
                {siteName}
            </span>
        </span>
    );
}
