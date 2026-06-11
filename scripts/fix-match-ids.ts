/**
 * One-time data migration:
 *  1. Rename all legacy match IDs to the {YY}{catId}{roundCode}{group}{n} convention
 *  2. Normalize `round` field on all matches to match Round.code
 *  3. Set `prelimFormat` on all existing categories from match ID patterns
 *  4. Add 3 missing 2025 MD-S Group-B matches (Tony Kim / Sunu Jung)
 *
 * Run: npx tsx scripts/fix-match-ids.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// [oldId, newId] — same means ID is already correct but round field may need fixing
const RENAMES: [string, string][] = [
  // ── 2024 MD-B ──────────────────────────────────────────────────────────────
  ["2024-MD-B-Prelims-1", "24MD-BPREA1"],
  ["2024-MD-B-Prelims-2", "24MD-BPREA2"],
  ["2024-MD-B-Prelims-3", "24MD-BPREA3"],
  ["2024-MD-B-Prelims-4", "24MD-BPREB1"],
  ["2024-MD-B-Prelims-5", "24MD-BPREB2"],
  ["2024-MD-B-Prelims-6", "24MD-BPREB3"],
  ["2024-MD-B-SF-1",      "24MD-BSF1"],
  ["2024-MD-B-SF-2",      "24MD-BSF2"],
  ["2024-MD-B-Final-1",   "24MD-BF"],

  // ── 2024 MD-G ──────────────────────────────────────────────────────────────
  ["2024-MD-G-Prelims-1", "24MD-GPREA1"],
  ["2024-MD-G-Prelims-2", "24MD-GPREA2"],
  ["2024-MD-G-Prelims-3", "24MD-GPREA3"],
  ["2024-MD-G-Prelims-4", "24MD-GPREB1"],
  ["2024-MD-G-Prelims-5", "24MD-GPREB2"],
  ["2024-MD-G-Prelims-6", "24MD-GPREB3"],
  ["2024-MD-G-SF-1",      "24MD-GSF1"],
  ["2024-MD-G-SF-2",      "24MD-GSF2"],
  ["2024-MD-G-Final-1",   "24MD-GF"],

  // ── 2024 MD-S (ROUND_ROBIN) ────────────────────────────────────────────────
  ["2024-MD-S-Prelims-1", "24MD-SPRE1"],
  ["2024-MD-S-Prelims-2", "24MD-SPRE2"],
  ["2024-MD-S-Prelims-3", "24MD-SPRE3"],
  ["2024-MD-S-Prelims-4", "24MD-SPRE4"],
  ["2024-MD-S-Prelims-5", "24MD-SPRE5"],
  ["2024-MD-S-Prelims-6", "24MD-SPRE6"],
  ["2024-MD-S-Final-1",   "24MD-SF"],

  // ── 2024 MS-B (ELIMINATION) ────────────────────────────────────────────────
  ["2024-MS-B-R16-1", "24MS-BR161"],
  ["2024-MS-B-R16-2", "24MS-BR162"],
  ["2024-MS-B-R16-3", "24MS-BR163"],
  ["2024-MS-B-R16-4", "24MS-BR164"],
  ["2024-MS-B-R16-5", "24MS-BR165"],
  ["2024-MS-B-R16-6", "24MS-BR166"],
  ["2024-MS-B-R16-7", "24MS-BR167"],
  ["2024-MS-B-R16-8", "24MS-BR168"],
  ["2024-MS-B-QF-1",  "24MS-BQF1"],
  ["2024-MS-B-QF-2",  "24MS-BQF2"],
  ["2024-MS-B-QF-3",  "24MS-BQF3"],
  ["2024-MS-B-QF-4",  "24MS-BQF4"],
  ["2024-MS-B-SF-1",  "24MS-BSF1"],
  ["2024-MS-B-SF-2",  "24MS-BSF2"],
  // 24MS-BF already correct

  // ── 2024 MS-S: PRE10 was wrongly labelled — it is the Final ───────────────
  ["24MS-SPRE10",   "24MS-SF"],

  // ── 2024 XD-B (add group letters, fix dashes) ─────────────────────────────
  ["24XD-BPRE1",   "24XD-BPREA1"],
  ["24XD-BPRE2",   "24XD-BPREA2"],
  ["24XD-BPRE3",   "24XD-BPREA3"],
  ["24XD-BPRE4",   "24XD-BPREB1"],
  ["24XD-BPRE5",   "24XD-BPREB2"],
  ["24XD-B-PRE6",  "24XD-BPREB3"],
  ["24-XD-BSF1",   "24XD-BSF1"],
  // 24XD-BF already correct

  // ── 2025 MD-B (B group: renumber 7-12 → 1-6; Final: drop 1) ──────────────
  ["25MD-BPREB7",  "25MD-BPREB1"],
  ["25MD-BPREB8",  "25MD-BPREB2"],
  ["25MD-BPREB9",  "25MD-BPREB3"],
  ["25MD-BPREB10", "25MD-BPREB4"],
  ["25MD-BPREB11", "25MD-BPREB5"],
  ["25MD-BPREB12", "25MD-BPREB6"],
  ["25MD-BF",      "25MD-BF"],   // already correct; listed so round field is normalised

  // ── 2025 MD-G (B group: renumber 7-12 → 1-6; Final: drop 1) ──────────────
  ["25MD-GPREB7",  "25MD-GPREB1"],
  ["25MD-GPREB8",  "25MD-GPREB2"],
  ["25MD-GPREB9",  "25MD-GPREB3"],
  ["25MD-GPREB10", "25MD-GPREB4"],
  ["25MD-GPREB11", "25MD-GPREB5"],
  ["25MD-GPREB12", "25MD-GPREB6"],
  ["25MD-GF1",     "25MD-GF"],

  // ── 2025 MD-S (renumber non-A groups; Final: drop 1) ──────────────────────
  ["25MD-SPREB8",  "25MD-SPREB1"],
  ["25MD-SPREB9",  "25MD-SPREB2"],
  ["25MD-SPREB11", "25MD-SPREB3"],
  ["25MD-SPREC13", "25MD-SPREC1"],
  ["25MD-SPREC14", "25MD-SPREC2"],
  ["25MD-SPREC15", "25MD-SPREC3"],
  ["25MD-SPREC16", "25MD-SPREC4"],
  ["25MD-SPREC17", "25MD-SPREC5"],
  ["25MD-SPREC18", "25MD-SPREC6"],
  ["25MD-SPRED19", "25MD-SPRED1"],
  ["25MD-SPRED20", "25MD-SPRED2"],
  ["25MD-SPRED21", "25MD-SPRED3"],
  ["25MD-SPRED22", "25MD-SPRED4"],
  ["25MD-SPRED23", "25MD-SPRED5"],
  ["25MD-SPRED24", "25MD-SPRED6"],
  ["25MD-SF1",     "25MD-SF"],

  // ── 2025 MS-B (B group: 7-12 → 1-6; C group: 13-15 → 1-3; Final: drop 1) ─
  ["25MS-BPREB7",  "25MS-BPREB1"],
  ["25MS-BPREB8",  "25MS-BPREB2"],
  ["25MS-BPREB9",  "25MS-BPREB3"],
  ["25MS-BPREB10", "25MS-BPREB4"],
  ["25MS-BPREB11", "25MS-BPREB5"],
  ["25MS-BPREB12", "25MS-BPREB6"],
  ["25MS-BPREC13", "25MS-BPREC1"],
  ["25MS-BPREC14", "25MS-BPREC2"],
  ["25MS-BPREC15", "25MS-BPREC3"],
  ["25MS-BF1",     "25MS-BF"],

  // ── 2025 MS-S (B group: 4-6 → 1-3; Final: drop 1) ────────────────────────
  ["25MS-SPREB4",  "25MS-SPREB1"],
  ["25MS-SPREB5",  "25MS-SPREB2"],
  ["25MS-SPREB6",  "25MS-SPREB3"],
  ["25MS-SF1",     "25MS-SF"],

  // ── 2025 WD-B (ROUND_ROBIN: drop group letter A; Final: drop 1) ───────────
  ["25WD-BPREA1",  "25WD-BPRE1"],
  ["25WD-BPREA2",  "25WD-BPRE2"],
  ["25WD-BPREA3",  "25WD-BPRE3"],
  ["25WD-BPREA4",  "25WD-BPRE4"],
  ["25WD-BPREA5",  "25WD-BPRE5"],
  ["25WD-BPREA6",  "25WD-BPRE6"],
  ["25WD-BF1",     "25WD-BF"],

  // ── 2025 WD-S (ROUND_ROBIN: drop group letter A; Final: drop 1) ───────────
  ["25WD-SPREA1",  "25WD-SPRE1"],
  ["25WD-SPREA2",  "25WD-SPRE2"],
  ["25WD-SPREA3",  "25WD-SPRE3"],
  ["25WD-SPREA4",  "25WD-SPRE4"],
  ["25WD-SPREA5",  "25WD-SPRE5"],
  ["25WD-SPREA6",  "25WD-SPRE6"],
  ["25WD-SF1",     "25WD-SF"],

  // ── 2025 XD-B (ROUND_ROBIN: drop group letter A; Final: drop 1) ───────────
  ["25XD-BPREA1",  "25XD-BPRE1"],
  ["25XD-BPREA2",  "25XD-BPRE2"],
  ["25XD-BPREA3",  "25XD-BPRE3"],
  ["25XD-BPREA4",  "25XD-BPRE4"],
  ["25XD-BPREA5",  "25XD-BPRE5"],
  ["25XD-BPREA6",  "25XD-BPRE6"],
  ["25XD-BF1",     "25XD-BF"],

  // ── 2025 XD-S (wrong group letters on B and C; Final: drop 1) ─────────────
  ["25XD-SPREA4",  "25XD-SPREB1"],
  ["25XD-SPREA5",  "25XD-SPREB2"],
  ["25XD-SPREA6",  "25XD-SPREB3"],
  ["25XD-SPREA7",  "25XD-SPREC1"],
  ["25XD-SPREA8",  "25XD-SPREC2"],
  ["25XD-SPREA9",  "25XD-SPREC3"],
  ["25XD-SF1",     "25XD-SF"],
];


async function main() {
  // ── 1. Rename match IDs ────────────────────────────────────────────────────
  for (const [oldId, newId] of RENAMES) {
    if (oldId === newId) continue;
    const match = await prisma.match.findUnique({ where: { id: oldId } });
    if (!match) { console.log(`SKIP  ${oldId} — not found`); continue; }

    // Save which bookings point to this match, null them, rename, then restore
    const linkedBookings = await prisma.courtBooking.findMany({ where: { matchId: oldId }, select: { id: true } });
    await prisma.courtBooking.updateMany({ where: { matchId: oldId }, data: { matchId: null } });
    await prisma.match.update({ where: { id: oldId }, data: { id: newId } });
    if (linkedBookings.length > 0) {
      await prisma.courtBooking.updateMany({
        where: { id: { in: linkedBookings.map((b) => b.id) } },
        data: { matchId: newId },
      });
    }
    console.log(`RENAMED  ${oldId} → ${newId}`);
  }

  // ── 2. (no-op) round normalization is now handled by scripts/fix-round-codes.ts ─

  // ── 3. Set prelimFormat on existing categories ─────────────────────────────
  const matches = await prisma.match.findMany({ select: { categoryId: true, id: true, tournamentYear: true } });
  const formatByCat = new Map<string, string>();
  for (const m of matches) {
    const key = m.categoryId;
    if (formatByCat.has(key)) continue;
    const id = m.id;
    if (/PRE[A-Z]\d/i.test(id)) {
      formatByCat.set(key, "GROUP_ROUND_ROBIN");
    } else if (/PRE\d/.test(id)) {
      formatByCat.set(key, "ROUND_ROBIN");
    } else if (/R16|R32/.test(id)) {
      formatByCat.set(key, "ELIMINATION");
    }
  }
  for (const [catId, format] of formatByCat) {
    await prisma.category.update({ where: { id: catId }, data: { prelimFormat: format } });
    console.log(`FORMAT   ${catId} → ${format}`);
  }

  // ── 4. Add 3 missing 2025 MD-S Group-B matches ────────────────────────────
  const newMatches = [
    {
      id: "25MD-SPREB4",
      team1Id: "2025MD-S2",  // Sung Hwa Hong / Damon Shin
      team2Id: "2025MD-S9",  // Tony Kim / Sunu Jung
      date: "2025-07-26", time: "9:00AM", location: "Gates Park",
      set1T1: "6", set1T2: "0", set2T1: "6", set2T2: "3",
    },
    {
      id: "25MD-SPREB5",
      team1Id: "2025MD-S9",  // Tony Kim / Sunu Jung
      team2Id: "2025MD-S5",  // David Lee / Eden Kim
      date: "2025-07-29", time: "8:00PM", location: "Mackin",
      set1T1: "6", set1T2: "5", set2T1: "6", set2T2: "5",
    },
    {
      id: "25MD-SPREB6",
      team1Id: "2025MD-S9",  // Tony Kim / Sunu Jung
      team2Id: "2025MD-S4",  // Myonghwan Ahn / Kyumin Kim
      date: "2025-08-01", time: "8:00PM", location: "Eagle Ridge",
      set1T1: "6", set1T2: "2", set2T1: "6", set2T2: "3",
    },
  ];
  for (const m of newMatches) {
    await prisma.match.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id, tournamentYear: 2025, categoryId: "MD-S",
        round: "PRE",
        team1Id: m.team1Id, team2Id: m.team2Id,
        matchStatus: "Completed",
        date: m.date, time: m.time, location: m.location,
        set1ScoreTeam1: m.set1T1, set1ScoreTeam2: m.set1T2,
        set2ScoreTeam1: m.set2T1, set2ScoreTeam2: m.set2T2,
      },
    });
    console.log(`ADDED    ${m.id}`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
