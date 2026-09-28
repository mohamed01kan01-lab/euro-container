import { LegalDocument, legalMetadata } from "@/components/public/legal-document";

export function generateMetadata() {
    return legalMetadata("shipping");
}

export default function ShippingPage() {
    return <LegalDocument doc="shipping" draft={false} />;
}
