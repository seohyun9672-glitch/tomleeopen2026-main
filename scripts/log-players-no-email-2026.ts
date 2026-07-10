/**
 * Log all players with no email who have 2026 registrations.
 *
 * Run with: npx tsx scripts/log-players-no-email-2026.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const YEAR = 2026;

async function main() {
  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentYear: YEAR,
      player: { email: "" },
    },
    include: {
      player: { select: { id: true, email: true, fullNameEn: true, fullNameKo: true, phone: true } },
      category: { select: { id: true, label: true } },
    },
    distinct: ["playerId"],
  });

  if (registrations.length === 0) {
    console.log("No 2026 registrants found without an email.");
    return;
  }

  console.log(`Found ${registrations.length} player(s) with no email registered in 2026:\n`);
  for (const reg of registrations) {
    const p = reg.player;
    console.log(`  Player ID : ${p.id}`);
    console.log(`  Name (EN) : ${p.fullNameEn}`);
    console.log(`  Name (KO) : ${p.fullNameKo ?? "—"}`);
    console.log(`  Email     : "${p.email}"`);
    console.log(`  Phone     : ${p.phone ?? "—"}`);
    console.log("");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
