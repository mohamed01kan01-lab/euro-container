import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    console.log({
        siteName: s?.siteName,
        currency: s?.currency,
        cloudinaryCloudName: s?.cloudinaryCloudName ? "set" : "EMPTY",
        cloudinaryApiKey: s?.cloudinaryApiKey ? "set" : "EMPTY",
        cloudinaryApiSecret: s?.cloudinaryApiSecret ? "set" : "EMPTY",
        productCount: await prisma.product.count(),
        categoryCount: await prisma.productCategory.count(),
    });
}

main().finally(() => prisma.$disconnect());
