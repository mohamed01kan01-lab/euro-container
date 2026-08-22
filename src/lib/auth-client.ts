import { createAuthClient } from "better-auth/react";
import { emailOTPClient, adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";
import { ac, ADMIN, EDITOR, CLIENT } from "@/lib/auth-permissions";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    plugins: [
        emailOTPClient(),
        adminClient({ ac, roles: { ADMIN, EDITOR, CLIENT } }),
        inferAdditionalFields<typeof auth>(),
    ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
