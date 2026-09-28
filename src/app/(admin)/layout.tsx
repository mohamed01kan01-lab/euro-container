import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/app/(admin)/dashboard/settings/actions";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login?callbackUrl=/dashboard");
    }

    const { user } = session;
    const role = (user as { role?: string }).role;

    if (role !== "ADMIN" && role !== "EDITOR") {
        redirect("/");
    }

    const [settings, toVerify, toRefund] = await Promise.all([
        getSiteSettings(),
        prisma.order.count({ where: { paymentStatus: "VERIFYING" } }),
        prisma.order.count({ where: { paymentStatus: "REFUND_REQUESTED" } }),
    ]);

    return (
        <AdminShell
            user={{
                id: user.id,
                name: user.name,
                email: user.email,
                role: role ?? "CLIENT",
                image: (user as { image?: string | null }).image ?? null,
            }}
            brand={{ siteName: settings.siteName, logo: settings.logo }}
            todo={{ toVerify, toRefund }}
        >
            {children}
        </AdminShell>
    );
}
