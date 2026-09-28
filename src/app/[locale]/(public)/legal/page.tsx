import { LegalDocument, legalMetadata } from "@/components/public/legal-document";

export function generateMetadata() {
    return legalMetadata("notice");
}

export default function LegalNoticePage() {
    return <LegalDocument doc="notice" />;
}
