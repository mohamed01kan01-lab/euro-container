import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Secteurs de livraison et point de retrait FICTIFS, en attendant les vrais
 * tarifs. Sans au moins l'un des deux, le checkout est indisponible.
 * Idempotent : relancer le script met à jour les entrées au lieu de les dupliquer.
 *
 * Usage : pnpm tsx scripts/seed-shipping.ts
 */
const ZONES = [
    { name: "Île-de-France", price: 390, freeAbove: null, estimatedDays: "3 à 5 jours ouvrés" },
    { name: "France métropolitaine", price: 690, freeAbove: 12000, estimatedDays: "5 à 10 jours ouvrés" },
    { name: "Belgique et Luxembourg", price: 790, freeAbove: null, estimatedDays: "7 à 12 jours ouvrés" },
];

const PICKUPS = [
    {
        name: "Dépôt du Havre",
        address: "12 rue des Docks, 76600 Le Havre",
        hours: "Lundi au vendredi, 8h à 17h",
        details: "Chargement par grue sur rendez-vous. Prévoir un camion plateau adapté.",
    },
];

async function main() {
    for (const zone of ZONES) {
        const existing = await prisma.shippingZone.findFirst({ where: { name: zone.name } });
        if (existing) {
            await prisma.shippingZone.update({ where: { id: existing.id }, data: { ...zone, isActive: true } });
        } else {
            await prisma.shippingZone.create({ data: { ...zone, isActive: true } });
        }
    }

    for (const point of PICKUPS) {
        const existing = await prisma.pickupPoint.findFirst({ where: { name: point.name } });
        if (existing) {
            await prisma.pickupPoint.update({ where: { id: existing.id }, data: { ...point, isActive: true } });
        } else {
            await prisma.pickupPoint.create({ data: { ...point, isActive: true } });
        }
    }

    console.log(`${ZONES.length} secteurs de livraison et ${PICKUPS.length} point de retrait enregistrés.`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
