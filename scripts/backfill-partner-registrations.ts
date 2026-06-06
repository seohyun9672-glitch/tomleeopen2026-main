/**
 * Backfills TournamentRegistration rows for players who appear only as a partner
 * (partnerId) in a doubles registration but have no registration of their own for
 * that year + category.
 *
 * Run: npx tsx scripts/backfill-partner-registrations.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentYear: { in: [2024, 2025] },
      partnerId: { not: null },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const partnerId = reg.partnerId!;

    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentYear_playerId_categoryId: {
          tournamentYear: reg.tournamentYear,
          playerId: partnerId,
          categoryId: reg.categoryId,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.tournamentRegistration.create({
      data: {
        tournamentYear: reg.tournamentYear,
        playerId: partnerId,
        categoryId: reg.categoryId,
        partnerId: reg.playerId,
        status: reg.status,
        photoVideoConsent: reg.photoVideoConsent,
        paymentReceived: reg.paymentReceived,
      },
    });

    created++;
    console.log(
      `  Created: year=${reg.tournamentYear} category=${reg.categoryId} partnerId=${partnerId} (from registration ${reg.id})`
    );
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
