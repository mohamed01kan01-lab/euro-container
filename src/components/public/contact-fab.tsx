"use client";

import { IconBrandWhatsapp, IconMail, IconMessageCircle, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { usePathname } from "@/i18n/routing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ContactFabLabels {
    open: string;
    close: string;
    title: string;
    subtitle: string;
    whatsapp: string;
    whatsappHint: string;
    email: string;
    message: string;
}

/**
 * wa.me n'accepte que l'indicatif + le numéro, sans « + », espaces ni « 00 ».
 * « +33 6 12 34 56 78 » → « 33612345678 ».
 */
function whatsappUrl(phone: string, message: string) {
    const digits = phone.replace(/\D/g, "").replace(/^00/, "");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}

/**
 * Bulle de contact flottante (bas droite) : WhatsApp et/ou email, lus dans les
 * réglages du site. Un seul canal disponible → la bulle l'ouvre directement.
 */
export function ContactFab({
    phone,
    email,
    labels,
}: {
    phone: string | null;
    email: string | null;
    labels: ContactFabLabels;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const wa = phone ? whatsappUrl(phone, labels.message) : null;
    const mail = email ? `mailto:${email}?subject=${encodeURIComponent(labels.message)}` : null;
    if (!wa && !mail) return null;

    // Le checkout mobile a sa propre barre fixée en bas : la bulle passe au-dessus.
    const position = cn(
        "fixed right-4 z-40 sm:right-6",
        pathname.startsWith("/checkout") ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6",
    );
    const bubble =
        "flex size-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-600/40";

    // Un seul canal : lien direct, pas de menu.
    if (!wa || !mail) {
        const only = wa
            ? { href: wa, label: labels.whatsapp, icon: <IconBrandWhatsapp size={26} />, external: true }
            : { href: mail!, label: labels.email, icon: <IconMail size={24} />, external: false };
        return (
            <a
                href={only.href}
                aria-label={only.label}
                className={cn(position, bubble)}
                {...(only.external && { target: "_blank", rel: "noopener noreferrer" })}
            >
                {only.icon}
            </a>
        );
    }

    const channels = [
        {
            href: wa,
            label: labels.whatsapp,
            hint: labels.whatsappHint,
            icon: <IconBrandWhatsapp size={20} />,
            iconClass: "bg-[#25D366] text-white",
            external: true,
        },
        {
            href: mail,
            label: labels.email,
            hint: email!,
            icon: <IconMail size={20} />,
            iconClass: "bg-orange-600/10 text-orange-600",
            external: false,
        },
    ];

    return (
        <div className={position}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button type="button" aria-label={open ? labels.close : labels.open} className={bubble}>
                        {open ? <IconX size={24} /> : <IconMessageCircle size={26} />}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="end"
                    sideOffset={12}
                    className="w-[min(18rem,calc(100vw-2rem))] gap-1 rounded-[22px] p-2"
                >
                    <div className="px-3 pt-2 pb-1">
                        <p className="font-semibold">{labels.title}</p>
                        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
                    </div>
                    {channels.map((c) => (
                        <a
                            key={c.label}
                            href={c.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
                            {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}
                        >
                            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", c.iconClass)}>
                                {c.icon}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold">{c.label}</span>
                                <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>
                            </span>
                        </a>
                    ))}
                </PopoverContent>
            </Popover>
        </div>
    );
}
