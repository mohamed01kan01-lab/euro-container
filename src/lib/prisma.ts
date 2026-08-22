import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // Un pool pg sans listener "error" fait planter le process quand une connexion
  // inactive tombe (fréquent avec un Postgres managé). On logge et on continue :
  // le pool ouvrira une nouvelle connexion à la requête suivante.
  pool.on("error", (err) => {
    console.error("[prisma] Erreur du pool PostgreSQL :", err);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
