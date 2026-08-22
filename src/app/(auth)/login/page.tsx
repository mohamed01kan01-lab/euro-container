import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export const metadata: Metadata = {
    title: "Connexion",
};

export default function LoginPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={2} />}>
            <LoginForm />
        </Suspense>
    );
}
