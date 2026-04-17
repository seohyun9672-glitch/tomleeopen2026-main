/**
 * Run BEFORE `prisma db push` to preserve match round data.
 * Creates the Round table, seeds 5 rows, backfills Match.roundId from the old
 * `round` enum column, then the subsequent db push can safely drop the old column.
 *
 * Usage: npx tsx prisma/backfill-rounds.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROUNDS = [
  { id: 1, code: "Pre", labelEn: "Preliminaries", labelKo: "예선",   sortOrder: 0 },
  { id: 2, code: "R16", labelEn: "Round of 16",   labelKo: "16강",   sortOrder: 1 },
  { id: 3, code: "QF",  labelEn: "Quarterfinals",  labelKo: "8강",   sortOrder: 2 },
  { id: 4, code: "SF",  labelEn: "Semifinals",     labelKo: "준결승", sortOrder: 3 },
  { id: 5, code: "F",   labelEn: "Final",          labelKo: "결승",  sortOrder: 4 },
];

async function main() {
  // 1. Create Round table if it doesn't exist yet.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Round" (
      "id"        SERIAL PRIMARY KEY,
      "code"      TEXT NOT NULL,
      "labelEn"   TEXT NOT NULL,
      "labelKo"   TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL,
      CONSTRAINT "Round_code_key" UNIQUE ("code")
    )
  `);
  console.log("Round table ready.");

  // 2. Seed round rows.
  for (const r of ROUNDS) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Round" ("id", "code", "labelEn", "labelKo", "sortOrder")
      VALUES (${r.id}, '${r.code}', '${r.labelEn}', '${r.labelKo}', ${r.sortOrder})
      ON CONFLICT ("code") DO UPDATE
        SET "labelEn" = EXCLUDED."labelEn",
            "labelKo" = EXCLUDED."labelKo",
            "sortOrder" = EXCLUDED."sortOrder"
    `);
  }
  console.log("Seeded rounds:", ROUNDS.map((r) => r.code).join(", "));

  // 3. Add roundId column if it doesn't exist.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "roundId" INTEGER
      REFERENCES "Round"("id") ON DELETE SET NULL
  `);
  console.log("roundId column ready.");

  // 4. Backfill roundId from old round column.
  //    Map both exact codes ("Pre","QF","SF","F","R16") and legacy all-caps enum values.
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Match"
    SET "roundId" = CASE "round"::text
      WHEN 'Pre'   THEN 1
      WHEN 'PRE'   THEN 1
      WHEN 'R16'   THEN 2
      WHEN 'QF'    THEN 3
      WHEN 'SF'    THEN 4
      WHEN 'F'     THEN 5
      WHEN 'FINAL' THEN 5
    END
    WHERE "round" IS NOT NULL AND "roundId" IS NULL
  `);
  console.log(`Backfilled ${result} match rows.`);

  // 5. Report any unmatched rows.
  const unmatched = await prisma.$queryRawUnsafe<{ round: string; cnt: bigint }[]>(`
    SELECT "round"::text AS round, COUNT(*) AS cnt
    FROM "Match"
    WHERE "round" IS NOT NULL AND "roundId" IS NULL
    GROUP BY "round"
  `);
  if (unmatched.length > 0) {
    console.warn("Unmatched round values (roundId NOT set):");
    unmatched.forEach(({ round, cnt }) => console.warn(`  "${round}": ${cnt} rows`));
  } else {
    console.log("All round values mapped successfully.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
