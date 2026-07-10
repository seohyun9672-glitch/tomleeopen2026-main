/**
 * Export 2026 active players and teams to XLSX.
 * - "Players" sheet: all active (Confirmed) players, with club code
 * - "Teams" sheet: all teams across categories
 * - One sheet per category: teams only (no Category column)
 * Run with: npx tsx scripts/export-2026-players.ts
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();
const YEAR = 2026;

const PRELIM_FORMAT_LABEL: Record<string, string> = {
  GROUP_ROUND_ROBIN: "Group Round Robin",
  ROUND_ROBIN: "Round Robin",
  ELIMINATION: "Elimination",
};

function colWidths(...widths: number[]) {
  return widths.map((wch) => ({ wch }));
}

async function main() {
  // ── Players sheet ────────────────────────────────────────────────────────
  const regs = await prisma.tournamentRegistration.findMany({
    where: { tournamentYear: YEAR, status: "Confirmed" },
    include: {
      category: { select: { id: true, label: true, sortOrder: true } },
      player: {
        select: {
          id: true,
          fullNameEn: true,
          fullNameKo: true,
          clubs: { include: { club: { select: { code: true } } } },
        },
      },
    },
    orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
  });

  const seen = new Set<string>();
  const playerRows: Record<string, string>[] = [];

  for (const reg of regs) {
    const key = `${reg.player.id}||${reg.categoryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    playerRows.push({
      Category: reg.category.label,
      "Name (EN)": reg.player.fullNameEn,
      "Name (KO)": reg.player.fullNameKo ?? "",
      Club: reg.player.clubs.map((pc) => pc.club.code).join(", "),
    });
  }

  playerRows.sort((a, b) =>
    a.Category.localeCompare(b.Category) ||
    a["Name (EN)"].localeCompare(b["Name (EN)"])
  );

  const playersWs = XLSX.utils.json_to_sheet(playerRows);
  playersWs["!cols"] = colWidths(26, 24, 18, 16);

  // ── Teams data ───────────────────────────────────────────────────────────
  const teams = await prisma.team.findMany({
    where: { tournamentYear: YEAR },
    include: {
      category: { select: { id: true, label: true, sortOrder: true } },
      member1: { select: { fullNameEn: true, fullNameKo: true } },
      member2: { select: { fullNameEn: true, fullNameKo: true } },
    },
    orderBy: [{ categoryId: "asc" }],
  });

  // Advancement rules per category for 2026
  const yearStatuses = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: YEAR },
  });
  const advancementMap = new Map(
    yearStatuses.map((s) => [
      s.categoryId,
      s.prelimFormat ? (PRELIM_FORMAT_LABEL[s.prelimFormat] ?? s.prelimFormat) : "",
    ])
  );

  type TeamRow = {
    Category?: string;
    Seed: string;
    "Team 1 (EN)": string;
    "Team 1 (KO)": string;
    "Team 2 (EN)": string;
    "Team 2 (KO)": string;
    "Advancement Rule": string;
  };

  const teamRows: TeamRow[] = teams.map((t) => ({
    Category: t.category.label,
    Seed: t.seed ?? "",
    "Team 1 (EN)": t.member1.fullNameEn,
    "Team 1 (KO)": t.member1.fullNameKo ?? "",
    "Team 2 (EN)": t.member2?.fullNameEn ?? "",
    "Team 2 (KO)": t.member2?.fullNameKo ?? "",
    "Advancement Rule": advancementMap.get(t.categoryId) ?? "",
  }));

  const sortTeams = (rows: TeamRow[]) =>
    rows.sort((a, b) => {
      const catCmp = (a.Category ?? "").localeCompare(b.Category ?? "");
      if (catCmp !== 0) return catCmp;
      const aSeeded = a.Seed !== "";
      const bSeeded = b.Seed !== "";
      if (aSeeded !== bSeeded) return aSeeded ? -1 : 1;
      if (aSeeded && bSeeded) return a.Seed.localeCompare(b.Seed, undefined, { numeric: true });
      return a["Team 1 (EN)"].localeCompare(b["Team 1 (EN)"]);
    });

  sortTeams(teamRows);

  const teamsWs = XLSX.utils.json_to_sheet(teamRows);
  teamsWs["!cols"] = colWidths(26, 8, 24, 18, 24, 18, 20);

  // ── Build workbook ───────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, playersWs, "Players");
  XLSX.utils.book_append_sheet(wb, teamsWs, "Teams");

  // Per-category team sheets (no Category column)
  const categories = [
    ...new Map(teams.map((t) => [t.category.id, t.category])).values(),
  ].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  for (const cat of categories) {
    const catRows = teamRows
      .filter((r) => r.Category === cat.label)
      .map(({ Category: _cat, ...rest }) => rest);

    const ws = XLSX.utils.json_to_sheet(catRows);
    ws["!cols"] = colWidths(8, 24, 18, 24, 18, 20);

    const sheetName = cat.label.replace(/[\\/*?[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const outPath = path.resolve("2026_players_roster.xlsx");
  XLSX.writeFile(wb, outPath);
  console.log(
    `Exported → ${outPath}\n` +
    `  Players sheet: ${playerRows.length} rows\n` +
    `  Teams sheet:   ${teamRows.length} teams across ${categories.length} categories`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
