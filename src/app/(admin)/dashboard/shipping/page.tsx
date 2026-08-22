import type { Metadata } from "next";
import { getSiteSettings } from "../settings/actions";
import { getShippingZones, getPickupPoints } from "./actions";
import { ShippingTabs } from "@/components/admin/shipping/shipping-tabs";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = { title: "Livraison" };

export default async function ShippingPage() {
    const [zones, points, settings] = await Promise.all([
        getShippingZones(),
        getPickupPoints(),
        getSiteSettings(),
    ]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Livraison"
                description="Secteurs livrés et points de retrait proposés au moment du paiement."
            />

            <ShippingTabs
                zones={zones}
                points={points}
                currency={settings.currency}
            />
        </section>
    );
}
