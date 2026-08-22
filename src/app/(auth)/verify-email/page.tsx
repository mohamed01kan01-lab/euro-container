import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export const metadata: Metadata = {
    title: "Vérifiez votre email",
};

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={1} />}>
            <VerifyEmailForm />
        </Suspense>
    );
}
