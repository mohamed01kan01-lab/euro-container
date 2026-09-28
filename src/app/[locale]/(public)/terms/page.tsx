import { LegalDocument, legalMetadata } from "@/components/public/legal-document";

export function generateMetadata() {
    return legalMetadata("terms");
}

export default function TermsPage() {
    return <LegalDocument doc="terms" />;
}
