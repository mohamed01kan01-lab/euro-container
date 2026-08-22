import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
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

    return (
        <AdminShell
            user={{
                id: user.id,
                name: user.name,
                email: user.email,
                role: role ?? "CLIENT",
                image: (user as { image?: string | null }).image ?? null,
            }}
        >
            {children}
        </AdminShell>
    );
}
