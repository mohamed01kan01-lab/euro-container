import type { Metadata } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import "./globals.css";

const lexend = Lexend({
    subsets: ["latin"],
    variable: "--font-heading",
    display: "swap",
    weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
    weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const title = settings.siteName;
    const description = settings.seoDescription ?? settings.description ?? undefined;

    return {
        title: {
            default: title,
            template: `%s — ${title}`,
        },
        description,
        metadataBase: new URL(
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        ),
        openGraph: {
            type: "website",
            siteName: title,
        },
        robots: {
            index: false,
            follow: false,
        },
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={`${lexend.variable} ${sourceSans.variable} h-full antialiased font-sans`}
            suppressHydrationWarning
        >
            <body>
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        <Toaster position="top-center" />
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
