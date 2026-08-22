import { createAccessControl } from "better-auth/plugins/access";

const statement = {
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const ADMIN = ac.newRole({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
});

export const EDITOR = ac.newRole({
    user: ["list", "get", "update"],
    session: ["list"],
});

export const CLIENT = ac.newRole({
    user: [],
    session: [],
});
