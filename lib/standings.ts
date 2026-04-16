/**
 * Standings and seed helpers for tournament categories (prelim groups).
 */

import type { MatchWithTeamNames } from "@/lib/matches";

export type TeamRow = { id: string; seed: string; player1Name: string; player2Name?: string };

/** Build team list from match payloads (for bracket rank map when draw hub rows are unavailable). */
export function teamRowsFromCategoryMatches(matches: MatchWithTeamNames[]): TeamRow[] {
  const map = new Map<string, TeamRow>();
  for (const m of matches) {
    const sides: Array<{
      id: string | null;
      seed: string | null;
      display: string | null;
    }> = [
      { id: m.team1Id, seed: m.team1Seed, display: m.team1DisplayName },
      { id: m.team2Id, seed: m.team2Seed, display: m.team2DisplayName },
    ];
    for (const s of sides) {
      if (!s.id || map.has(s.id)) continue;
      const parts = (s.display ?? "").split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
      map.set(s.id, {
        id: s.id,
        seed: (s.seed ?? "").trim(),
        player1Name: parts[0] ?? "—",
        player2Name: parts[1],
      });
    }
  }
  return Array.from(map.values());
}

export function getSeedsWithTeams(teams: TeamRow[]): string[] {
  const seeds = new Set<string>();
  for (const t of teams) {
    const s = (t.seed ?? "").trim().toUpperCase();
    if (s && "ABCD".includes(s)) seeds.add(s);
  }
  return Array.from(seeds).sort();
}

export type StandingsRow = {
  teamId: string;
  displayName: string;
  W: number;
  L: number;
  SD: number;
  GD: number;
};

type MatchRow = {
  team1Id: string | null;
  team2Id: string | null;
  winner: 1 | 2 | null;
  set1ScoreTeam1: string | null;
  set2ScoreTeam1: string | null;
  set1ScoreTeam2: string | null;
  set2ScoreTeam2: string | null;
};

function displayName(t: TeamRow): string {
  return t.player2Name ? `${t.player1Name} / ${t.player2Name}` : t.player1Name;
}

function parseSetScore(a: string | null, b: string | null): { t1: number; t2: number } | null {
  const n1 = a != null && a !== "" ? parseInt(a, 10) : NaN;
  const n2 = b != null && b !== "" ? parseInt(b, 10) : NaN;
  if (Number.isNaN(n1) || Number.isNaN(n2)) return null;
  return { t1: n1, t2: n2 };
}

export function computeStandingsForSeed(
  prelimMatches: MatchRow[],
  teams: TeamRow[],
  seed: string
): StandingsRow[] {
  const seedUpper = seed.trim().toUpperCase();
  const teamIdsInSeed = new Set(
    teams.filter((t) => (t.seed ?? "").trim().toUpperCase() === seedUpper).map((t) => t.id)
  );
  const matches = prelimMatches.filter((m) => {
    const t1 = m.team1Id && teamIdsInSeed.has(m.team1Id);
    const t2 = m.team2Id && teamIdsInSeed.has(m.team2Id);
    return t1 && t2;
  });
  return computeStandingsFromMatches(matches, teams);
}

export function computeStandingsAll(prelimMatches: MatchRow[], teams: TeamRow[]): StandingsRow[] {
  return computeStandingsFromMatches(prelimMatches, teams);
}

function computeStandingsFromMatches(matches: MatchRow[], teams: TeamRow[]): StandingsRow[] {
  const stats = new Map<
    string,
    { W: number; L: number; setsWon: number; setsLost: number; gamesWon: number; gamesLost: number }
  >();
  for (const t of teams) {
    stats.set(t.id, { W: 0, L: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 });
  }
  for (const m of matches) {
    const id1 = m.team1Id;
    const id2 = m.team2Id;
    if (!id1 || !id2) continue;
    const s1 = stats.get(id1)!;
    const s2 = stats.get(id2)!;
    const set1 = parseSetScore(m.set1ScoreTeam1, m.set1ScoreTeam2);
    const set2 = parseSetScore(m.set2ScoreTeam1, m.set2ScoreTeam2);
    if (set1) {
      s1.setsWon += set1.t1 > set1.t2 ? 1 : 0;
      s1.setsLost += set1.t1 < set1.t2 ? 1 : 0;
      s2.setsWon += set1.t2 > set1.t1 ? 1 : 0;
      s2.setsLost += set1.t2 < set1.t1 ? 1 : 0;
      s1.gamesWon += set1.t1;
      s1.gamesLost += set1.t2;
      s2.gamesWon += set1.t2;
      s2.gamesLost += set1.t1;
    }
    if (set2) {
      s1.setsWon += set2.t1 > set2.t2 ? 1 : 0;
      s1.setsLost += set2.t1 < set2.t2 ? 1 : 0;
      s2.setsWon += set2.t2 > set2.t1 ? 1 : 0;
      s2.setsLost += set2.t2 < set2.t1 ? 1 : 0;
      s1.gamesWon += set2.t1;
      s1.gamesLost += set2.t2;
      s2.gamesWon += set2.t2;
      s2.gamesLost += set2.t1;
    }
    if (m.winner === 1) {
      s1.W++;
      s2.L++;
    } else if (m.winner === 2) {
      s2.W++;
      s1.L++;
    }
  }
  return teams.map((t) => {
    const st = stats.get(t.id)!;
    return {
      teamId: t.id,
      displayName: displayName(t),
      W: st.W,
      L: st.L,
      SD: st.setsWon - st.setsLost,
      GD: st.gamesWon - st.gamesLost,
    };
  }).sort((a, b) => {
    if (b.W !== a.W) return b.W - a.W;
    if (b.SD !== a.SD) return b.SD - a.SD;
    return b.GD - a.GD;
  });
}

/** Trailing digits on team id (e.g. `MD-S7` → 7) for bracket labels when prelim rank is unknown. */
export function teamSlotNumberFromId(teamId: string | null | undefined): number | null {
  if (!teamId) return null;
  const m = teamId.match(/(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Overall category rank from prelim results (1 = best record). Ties break by W, then set diff, then game diff
 * (same order as `computeStandingsAll`).
 */
export function buildTeamRankMapFromPrelims(teams: TeamRow[], prelimMatches: MatchRow[]): Map<string, number> {
  const standings = computeStandingsAll(prelimMatches, teams);
  const map = new Map<string, number>();
  standings.forEach((row, i) => map.set(row.teamId, i + 1));
  return map;
}

/** Rank from prelims map, else slot number from team id. */
export function resolveBracketTeamDisplayRank(teamId: string | null | undefined, rankMap: Map<string, number>): number | null {
  if (!teamId) return null;
  const fromStandings = rankMap.get(teamId);
  if (fromStandings != null) return fromStandings;
  return teamSlotNumberFromId(teamId);
}
