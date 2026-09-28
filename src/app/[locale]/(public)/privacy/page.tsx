import { LegalDocument, legalMetadata } from "@/components/public/legal-document";

export function generateMetadata() {
    return legalMetadata("privacy");
}

export default function PrivacyPage() {
    return <LegalDocument doc="privacy" />;
}
