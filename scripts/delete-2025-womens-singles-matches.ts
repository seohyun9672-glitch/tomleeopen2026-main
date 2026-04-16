/**
 * Removes all Match rows for women's singles (categoryId WS-*) for tournament year 2025.
 * Run: npx tsx scripts/delete-2025-womens-singles-matches.ts
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const where = { tournamentYear: 2025, categoryId: { startsWith: "WS-" } as const };
  const before = await prisma.match.count({ where });
  if (before === 0) {
    console.log("No 2025 women's singles (WS-*) matches found; nothing to delete.");
    return;
  }
  const result = await prisma.match.deleteMany({ where });
  console.log(`Deleted ${result.count} match(es) (2025, categoryId WS-*).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
