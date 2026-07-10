import type { TeamRow } from "@/app/admin/AdminHub";
import { displayName } from "@/lib/names";
import { derivePrelimFormat } from "@/lib/generateMatches";

export type CategorySeedState = {
  format: string;
  groupCount: number;
  groupAssignments: string[][];
  elimAssignments: string[];
};

/** 6-8 → 2 groups, 9-12 → 3 groups, 13+ → 4 groups */
export function deriveGroupCount(teamCount: number): number {
  if (teamCount >= 13) return 4;
  if (teamCount >= 9) return 3;
  return 2;
}

export function teamDisplayLabel(t: TeamRow, locale: "en" | "ko"): string {
  const p1 = displayName(t.member1NameEn, t.member1NameKo, locale);
  const p2 = t.member2NameEn
    ? displayName(t.member2NameEn, t.member2NameKo, locale)
    : null;
  return p2 ? `${p1} / ${p2}` : p1;
}

export function toTeamOption(teamId: string, catTeams: TeamRow[], locale: "en" | "ko") {
  const t = catTeams.find((tm) => tm.teamId === teamId);
  return { id: teamId, label: t ? teamDisplayLabel(t, locale) : teamId };
}

export function buildCategoryState(
  catId: string,
  year: number,
  teams: TeamRow[],
  categoryPrelimFormat: string | null | undefined,
): CategorySeedState {
  const catTeams = teams.filter((t) => t.tournamentYear === year && t.categoryId === catId);
  const derivedFormat = derivePrelimFormat(catTeams.length);
  // Stored format may be stale (e.g. GROUP_ROUND_ROBIN saved when team count was higher).
  // Override with derived format if the stored one requires more teams than are present.
  const storedFormat = categoryPrelimFormat?.trim() || null;
  let format = storedFormat ?? derivedFormat;
  if (format === "GROUP_ROUND_ROBIN" && catTeams.length < 6) format = derivedFormat;

  if (format === "GROUP_ROUND_ROBIN") {
    const grouped = new Map<string, string[]>();
    for (const t of catTeams) {
      if (t.seed) {
        const g = t.seed.toUpperCase();
        if (!grouped.has(g)) grouped.set(g, []);
        grouped.get(g)!.push(t.teamId);
      }
    }
    const gc = grouped.size > 0 ? grouped.size : deriveGroupCount(catTeams.length);
    const groupAssignments = Array.from({ length: gc }, (_, i) =>
      grouped.get(String.fromCharCode(65 + i)) ?? []
    );
    return { format, groupCount: gc, groupAssignments, elimAssignments: [] };
  }
  if (format === "ELIMINATION") {
    const elimAssignments = Array.from({ length: catTeams.length }, (_, i) =>
      catTeams.find((t) => t.seed === String(i + 1))?.teamId ?? ""
    );
    return { format, groupCount: 0, groupAssignments: [], elimAssignments };
  }
  return { format, groupCount: 0, groupAssignments: [], elimAssignments: [] };
}
