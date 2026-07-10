import { PrismaClient } from "@prisma/client";
import { PRIZE_BRACKETS, getPrizeAmounts } from "../lib/prizes";

const prisma = new PrismaClient();

async function seedPrizesForYear(year: number) {
  const activeStatuses = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: year, status: "Active" },
    include: { category: { select: { id: true, isDoubles: true } } },
  });
  if (activeStatuses.length === 0) return 0;

  const teamCounts = await prisma.team.groupBy({
    by: ["categoryId"],
    where: { tournamentYear: year },
    _count: { id: true },
  });
  const countMap = new Map(teamCounts.map((r) => [r.categoryId, r._count.id]));

  let seeded = 0;
  for (const s of activeStatuses) {
    const teamCount = countMap.get(s.categoryId) ?? 0;
    const amounts = getPrizeAmounts(teamCount, year, s.category.isDoubles);
    if (!amounts) continue;
    await prisma.categoryPrize.upsert({
      where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: s.categoryId } },
      update: amounts,
      create: { tournamentYear: year, categoryId: s.categoryId, ...amounts },
    });
    seeded++;
  }
  return seeded;
}

async function main() {
  for (const year of Object.keys(PRIZE_BRACKETS).map(Number).sort()) {
    const n = await seedPrizesForYear(year);
    if (n > 0) console.log(`Seeded ${year} prizes: ${n} categories`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
