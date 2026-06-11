/**
 * Fix `round` string field for all matches using the match ID as ground truth.
 *
 * The match ID encodes the round code: 24MS-BR161 → R16, 24MS-BSF1 → SF, etc.
 * This is more reliable than roundId (integer that can shift with reseeding).
 *
 * Run: npx tsx scripts/fix-round-codes.ts
 */

import { prisma } from "@/lib/prisma";

// Order matters: check longer/more-specific codes before shorter ones.
const ROUND_PATTERNS: Array<[string, RegExp]> = [
  ["PRE", /PRE/i],
  ["R32", /R32/i],
  ["R16", /R16/i],
  ["QF",  /QF/i],
  ["SF",  /SF/i],
  // Finals: "F" appears at the end, not inside QF/SF/PRE — those are already matched above
  ["F",   /F(\d*)$/],
];

function extractRoundFromId(matchId: string): string | null {
  for (const [code, pattern] of ROUND_PATTERNS) {
    if (pattern.test(matchId)) return code;
  }
  return null;
}

async function main() {
  const matches = await prisma.match.findMany({
    select: { id: true, round: true },
    orderBy: { id: "asc" },
  });

  let fixed = 0;
  let skipped = 0;
  let unknown = 0;

  for (const m of matches) {
    const expected = extractRoundFromId(m.id);
    if (!expected) {
      console.warn(`UNKNOWN  ${m.id} — cannot determine round from ID`);
      unknown++;
      continue;
    }
    if (m.round === expected) {
      skipped++;
      continue;
    }
    await prisma.match.update({ where: { id: m.id }, data: { round: expected } });
    console.log(`FIXED    ${m.id}  "${m.round ?? "null"}" → "${expected}"`);
    fixed++;
  }

  console.log(`\nDone: ${fixed} fixed, ${skipped} already correct, ${unknown} unknown`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
