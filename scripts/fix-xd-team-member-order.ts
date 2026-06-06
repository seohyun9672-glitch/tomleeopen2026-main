/**
 * One-time script to fix member ordering on mixed doubles (XD) teams.
 * Ensures member1 = male, member2 = female for all XD teams where both genders are known.
 *
 * Run: npx tsx scripts/fix-xd-team-member-order.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const xdTeams = await prisma.team.findMany({
    where: { categoryId: { startsWith: "XD" } },
    select: {
      id: true,
      tournamentYear: true,
      member1PlayerId: true,
      member2PlayerId: true,
      member1: { select: { id: true, gender: true } },
      member2: { select: { id: true, gender: true } },
    },
  });

  let swapped = 0;
  let skipped = 0;

  for (const team of xdTeams) {
    if (!team.member2) { skipped++; continue; }

    const g1 = team.member1.gender;
    const g2 = team.member2.gender;

    if (g1 === "F" && g2 === "M") {
      await prisma.team.update({
        where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: team.id } },
        data: {
          member1PlayerId: team.member2PlayerId!,
          member2PlayerId: team.member1PlayerId,
        },
      });
      swapped++;
    } else {
      skipped++;
    }
  }

  console.log(`Done. Swapped: ${swapped}, skipped/unchanged: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
