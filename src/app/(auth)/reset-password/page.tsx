import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export const metadata: Metadata = {
    title: "Nouveau mot de passe",
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={3} />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
