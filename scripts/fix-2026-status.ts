/**
 * One-time migration: align 2026 category and registration statuses with new logic.
 *
 * Rules applied:
 * 1. Categories with ≥ 4 teams and status "Pending" → "Active"
 * 2. Categories still "Inactive" → ensure all registrations are "Cancelled"
 * 3. Active/Pending registration statuses are NOT reset (existing Confirmed/Pending reflect
 *    admin-verified state and are kept as the established baseline).
 *
 * Run with: npx tsx scripts/fix-2026-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const YEAR = 2026;
const MIN_TEAMS_FOR_ACTIVE = 4;

async function main() {
  // ── Step 1: Auto-activate categories that have reached ≥ 4 teams ─────────────
  const pendingCats = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: YEAR, status: "Pending" },
  });

  let activated = 0;
  for (const cat of pendingCats) {
    const teamCount = await prisma.team.count({
      where: { tournamentYear: YEAR, categoryId: cat.categoryId },
    });
    if (teamCount >= MIN_TEAMS_FOR_ACTIVE) {
      await prisma.categoryYearStatus.update({
        where: { tournamentYear_categoryId: { tournamentYear: YEAR, categoryId: cat.categoryId } },
        data: { status: "Active" },
      });
      console.log(`  Activated ${cat.categoryId} (${teamCount} teams)`);
      activated++;
    }
  }
  console.log(`Step 1: Activated ${activated} categories.`);

  // ── Step 2: Ensure Inactive categories have all registrations Cancelled ───────
  const inactiveCats = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: YEAR, status: "Inactive" },
  });

  let cancelledRegs = 0;
  for (const cat of inactiveCats) {
    const result = await prisma.tournamentRegistration.updateMany({
      where: {
        tournamentYear: YEAR,
        categoryId: cat.categoryId,
        NOT: { status: "Cancelled" },
      },
      data: { status: "Cancelled" },
    });
    if (result.count > 0) {
      console.log(`  Cancelled ${result.count} regs in ${cat.categoryId}`);
      cancelledRegs += result.count;
    }
  }
  console.log(`Step 2: Cancelled ${cancelledRegs} registrations in Inactive categories.`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const allCatStatuses = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: YEAR },
  });
  const counts = allCatStatuses.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\nFinal 2026 category status counts:", counts);

  const allRegStatuses = await prisma.tournamentRegistration.groupBy({
    by: ["status"],
    where: { tournamentYear: YEAR },
    _count: true,
  });
  console.log(
    "Final 2026 registration status counts:",
    Object.fromEntries(allRegStatuses.map((r) => [r.status, r._count])),
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
