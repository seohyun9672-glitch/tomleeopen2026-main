import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Single client per dev server process to avoid exhausting DB connections during hot reload.
 */
export const prisma = (globalForPrisma.prisma ??= createPrisma());
