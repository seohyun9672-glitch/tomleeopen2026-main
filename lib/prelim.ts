import { computeWinner, isCancelledMatch } from "@/lib/matches";

export type PrelimStats = { w: number; l: number; sd: number; gd: number };

type PrelimMatch = {
  matchStatus: string;
  team1Id: string | null;
  team2Id: string | null;
  set1ScoreTeam1: string | null; set2ScoreTeam1: string | null; set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null; set2ScoreTeam2: string | null; set3ScoreTeam2: string | null;
};

export function computePrelimStats(matches: PrelimMatch[]): Map<string, PrelimStats> {
  const stats = new Map<string, PrelimStats>();
  const ensure = (id: string | null) => { if (id && !stats.has(id)) stats.set(id, { w: 0, l: 0, sd: 0, gd: 0 }); };

  for (const m of matches) {
    ensure(m.team1Id); ensure(m.team2Id);
    if (isCancelledMatch(m.matchStatus)) {
      const t1 = m.team1Id ? stats.get(m.team1Id) : null;
      const t2 = m.team2Id ? stats.get(m.team2Id) : null;
      if (t1) { t1.l += 1; t1.sd -= 2; t1.gd -= 12; }
      if (t2) { t2.l += 1; t2.sd -= 2; t2.gd -= 12; }
      continue;
    }
    if (!m.team1Id || !m.team2Id) continue;
    const winner = computeWinner(m);
    if (winner == null) continue;
    const t1 = stats.get(m.team1Id)!; const t2 = stats.get(m.team2Id)!;
    if (winner === 1) { t1.w += 1; t2.l += 1; } else { t2.w += 1; t1.l += 1; }
    for (const [a, b] of [
      [m.set1ScoreTeam1, m.set1ScoreTeam2],
      [m.set2ScoreTeam1, m.set2ScoreTeam2],
      [m.set3ScoreTeam1, m.set3ScoreTeam2],
    ] as Array<[string | null, string | null]>) {
      const n1 = a != null ? parseInt(a, 10) : NaN; const n2 = b != null ? parseInt(b, 10) : NaN;
      if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
      t1.gd += n1 - n2; t2.gd += n2 - n1;
      if (n1 > n2) { t1.sd += 1; t2.sd -= 1; } else if (n2 > n1) { t2.sd += 1; t1.sd -= 1; }
    }
  }
  return stats;
}

export function sortByStats(ids: string[], statsMap: Map<string, PrelimStats>): string[] {
  return [...ids].sort((a, b) => {
    const sa = statsMap.get(a) ?? { w: 0, sd: 0, gd: 0 };
    const sb = statsMap.get(b) ?? { w: 0, sd: 0, gd: 0 };
    return sb.w !== sa.w ? sb.w - sa.w : sb.sd !== sa.sd ? sb.sd - sa.sd : sb.gd - sa.gd;
  });
}

/** Returns a map of teamId → 1-based rank position across all teams in the stats map. */
export function buildPrelimRankMap(statsMap: Map<string, PrelimStats>): Map<string, number> {
  const sorted = sortByStats([...statsMap.keys()], statsMap);
  const out = new Map<string, number>();
  sorted.forEach((id, i) => out.set(id, i + 1));
  return out;
}
