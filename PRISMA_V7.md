# Intégration Prisma v7 — Next.js + Neon PostgreSQL

## Installation

```bash
# Dev
pnpm add -D prisma tsx @types/pg

# Prod
pnpm add @prisma/client @prisma/adapter-pg pg dotenv

# Init
pnpm dlx prisma init
```

## prisma.config.ts (racine du projet)

```ts
import "dotenv/config"; // obligatoire — DOIT être en premier
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: { url: env("DATABASE_URL") },
});
```

## prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
```

## .env

```env
DATABASE_URL="postgresql://user:password@ep-slug-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## Synchronisation

```bash
pnpm prisma db push
pnpm prisma generate
```

## lib/prisma.ts

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Utilisation

```ts
import { prisma } from "@/lib/prisma";

const users = await prisma.user.findMany();
```

---

## Différences clés v6 → v7

| Quoi   | v6                                            | v7                                  |
| ------ | --------------------------------------------- | ----------------------------------- |
| Config | Tout dans `schema.prisma`                     | Fichier `prisma.config.ts` dédié    |
| URL DB | `url = env("DATABASE_URL")` dans `datasource` | Dans `prisma.config.ts` via `env()` |
| Driver | Client natif intégré                          | `@prisma/adapter-pg` obligatoire    |
| dotenv | Chargé automatiquement                        | `import "dotenv/config"` manuel     |
