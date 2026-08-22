import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { getUsers } from "./actions";
import { UsersTable } from "@/components/admin/users/users-table";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UserCreateDialog } from "@/components/admin/users/user-create-dialog";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TableCard } from "@/components/admin/ui/table-card";

export const metadata: Metadata = { title: "Utilisateurs" };

const STATUSES = ["ACTIVE", "BANNED", "UNVERIFIED"] as const;
type Status = (typeof STATUSES)[number];

interface PageProps {
    searchParams: Promise<{
        role?: string;
        status?: string;
        q?: string;
    }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const role = isRole(params.role) ? params.role : undefined;
    const status = STATUSES.includes(params.status as Status)
        ? (params.status as Status)
        : undefined;
    const q = params.q?.trim() || undefined;

    const [session, users] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        getUsers({ role, status, q }),
    ]);

    const currentRole = (session?.user as { role?: string } | undefined)?.role;
    const canWrite = currentRole === "ADMIN";

    return (
        <section className="space-y-6">
            <PageHeader
                title="Utilisateurs"
                description={`${users.length} utilisateur${users.length !== 1 ? "s" : ""}`}
                actions={canWrite ? <UserCreateDialog /> : undefined}
            />

            <UsersFilters />

            <TableCard>
                <UsersTable
                    users={users}
                    canWrite={canWrite}
                    currentUserId={session?.user.id ?? ""}
                />
            </TableCard>
        </section>
    );
}
