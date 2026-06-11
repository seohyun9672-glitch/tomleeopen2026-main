/**
 * Diagnostic: show all teams and matches for MD-G 2025.
 * Run: npx tsx scripts/diagnose-mdg-2025.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const year = 2025;
  const categoryId = "MD-G";

  const teams = await prisma.team.findMany({
    where: { tournamentYear: year, categoryId },
    include: {
      member1: { select: { id: true, fullNameEn: true } },
      member2: { select: { id: true, fullNameEn: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`\n=== Teams in ${year} ${categoryId} ===`);
  for (const t of teams) {
    console.log(`  ${t.id}: ${t.member1.fullNameEn} + ${t.member2?.fullNameEn ?? "(none)"}`);
  }

  const matches = await prisma.match.findMany({
    where: { tournamentYear: year, categoryId },
    include: {
      team1: { include: { member1: { select: { fullNameEn: true } }, member2: { select: { fullNameEn: true } } } },
      team2: { include: { member1: { select: { fullNameEn: true } }, member2: { select: { fullNameEn: true } } } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`\n=== Matches in ${year} ${categoryId} (${matches.length} total) ===`);
  for (const m of matches) {
    const t1 = m.team1 ? `${m.team1.member1.fullNameEn} / ${m.team1.member2?.fullNameEn ?? "?"}` : "(no team1)";
    const t2 = m.team2 ? `${m.team2.member1.fullNameEn} / ${m.team2.member2?.fullNameEn ?? "?"}` : "(no team2)";
    console.log(`  ${m.id}  ${t1}  vs  ${t2}  [${m.matchStatus}]  date=${m.date ?? "-"}  ${m.set1ScoreTeam1 ?? "-"}/${m.set1ScoreTeam2 ?? "-"}`);
  }

  // Find Eugene and Rika Joy specifically
  const eugene = await prisma.player.findMany({
    where: { fullNameEn: { contains: "Eugene Joy", mode: "insensitive" } },
    select: { id: true, fullNameEn: true, email: true },
  });
  const rika = await prisma.player.findMany({
    where: { fullNameEn: { contains: "Rika Joy", mode: "insensitive" } },
    select: { id: true, fullNameEn: true, email: true },
  });

  console.log("\n=== Eugene Joy records ===");
  for (const p of eugene) console.log(`  id=${p.id}  email=${p.email}  name=${p.fullNameEn}`);
  console.log("=== Rika Joy records ===");
  for (const p of rika) console.log(`  id=${p.id}  email=${p.email}  name=${p.fullNameEn}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
