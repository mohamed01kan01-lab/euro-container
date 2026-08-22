import type { Role } from "@prisma/client";

/** Libellés français des rôles, partagés entre le dashboard et les emails. */
export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: "Admin",
    EDITOR: "Éditeur",
    CLIENT: "Client",
};

export const ROLE_VALUES: Role[] = ["ADMIN", "EDITOR", "CLIENT"];

export function isRole(value: string | undefined): value is Role {
    return !!value && ROLE_VALUES.includes(value as Role);
}
