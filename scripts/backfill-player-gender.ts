/**
 * One-time script to auto-fill Player.gender based on tournament registration categories.
 * - MD-* or MS-* registrations → M (Men's)
 * - WD-* or WS-* registrations → F (Women's), only if not already assigned
 *
 * Run: npx ts-node --project tsconfig.json -e "require('./scripts/backfill-player-gender')"
 * Or:  npx tsx scripts/backfill-player-gender.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find player IDs with men's category registrations
  const maleRegs = await prisma.tournamentRegistration.findMany({
    where: {
      OR: [
        { categoryId: { startsWith: "MD-" } },
        { categoryId: { startsWith: "MS-" } },
      ],
    },
    select: { playerId: true },
    distinct: ["playerId"],
  });

  const maleIds = maleRegs.map((r) => r.playerId);

  if (maleIds.length > 0) {
    const { count: maleCount } = await prisma.player.updateMany({
      where: { id: { in: maleIds } },
      data: { gender: "M" },
    });
    console.log(`Set gender=M for ${maleCount} players`);
  }

  // Find player IDs with women's category registrations (not already assigned M)
  const femaleRegs = await prisma.tournamentRegistration.findMany({
    where: {
      OR: [
        { categoryId: { startsWith: "WD-" } },
        { categoryId: { startsWith: "WS-" } },
      ],
      player: { gender: null },
    },
    select: { playerId: true },
    distinct: ["playerId"],
  });

  const femaleIds = femaleRegs.map((r) => r.playerId);

  if (femaleIds.length > 0) {
    const { count: femaleCount } = await prisma.player.updateMany({
      where: { id: { in: femaleIds } },
      data: { gender: "F" },
    });
    console.log(`Set gender=F for ${femaleCount} players`);
  }

  const totalAssigned = maleIds.length + femaleIds.length;
  console.log(`Done. Total players with gender assigned: ${totalAssigned}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
