import type { MatchWithTeamNames } from "@/lib/matches";
import { MATCH_ROUND_PRE } from "@/lib/matchRoundCode";

export type PrelimsLeaderboardRow = {
  rank: number;
  seed: string;
  player1: string;
  player2?: string;
  player1Ko?: string;
  player2Ko?: string;
  w: number;
  l: number;
  sd: number;
  gd: number;
  teamId: string;
};

/** Group letter from seed like "A1" → "A". */
export function groupKeyFromSeed(seed: string | null): string {
  const s = (seed ?? "").trim();
  const m = /^([A-Za-z])(?:\d+)?$/.exec(s);
  return m ? m[1]!.toUpperCase() : "";
}

function parseSetValues(m: MatchWithTeamNames): Array<[number, number]> {
  const sets: Array<[string | null, string | null]> = [
    [m.set1ScoreTeam1, m.set1ScoreTeam2],
    [m.set2ScoreTeam1, m.set2ScoreTeam2],
    [m.set3ScoreTeam1, m.set3ScoreTeam2],
  ];
  const out: Array<[number, number]> = [];
  for (const [a, b] of sets) {
    const n1 = a != null ? parseInt(a, 10) : NaN;
    const n2 = b != null ? parseInt(b, 10) : NaN;
    if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
    out.push([n1, n2]);
  }
  return out;
}

/**
 * Prelims / R16 standings (W–L, set diff, game diff) for leaderboard tables.
 * Returns null if fewer than 2 teams or no prelims matches.
 */
export function buildPrelimsLeaderboard(categoryMatches: MatchWithTeamNames[]): {
  groups: string[];
  rowsByGroup: Record<string, PrelimsLeaderboardRow[]>;
} | null {
  const prelims = categoryMatches.filter((m) => m.round === MATCH_ROUND_PRE);
  if (prelims.length === 0) return null;

  const stats = new Map<
    string,
    {
      teamId: string;
      seed: string;
      player1: string;
      player2?: string;
      player1Ko?: string;
      player2Ko?: string;
      w: number;
      l: number;
      sd: number;
      gd: number;
      group: string;
    }
  >();

  function ensure(
    teamId: string | null,
    seed: string | null,
    player: string | null,
    playerKo: string | null
  ) {
    if (!teamId) return;
    const name = (player ?? "—").trim() || "—";
    const names = name.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
    const koRaw = (playerKo ?? "").trim();
    const namesKo = koRaw ? koRaw.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean) : [];

    if (!stats.has(teamId)) {
      stats.set(teamId, {
        teamId,
        seed: (seed ?? "—").trim() || "—",
        player1: names[0] ?? "—",
        player2: names[1],
        player1Ko: namesKo[0],
        player2Ko: namesKo[1],
        w: 0,
        l: 0,
        sd: 0,
        gd: 0,
        group: groupKeyFromSeed(seed),
      });
    } else {
      const row = stats.get(teamId)!;
      if (!row.player1Ko && namesKo[0]) row.player1Ko = namesKo[0];
      if (!row.player2Ko && namesKo[1]) row.player2Ko = namesKo[1];
    }
  }

  for (const m of prelims) {
    ensure(m.team1Id, m.team1Seed, m.team1DisplayName, m.team1DisplayNameKo);
    ensure(m.team2Id, m.team2Seed, m.team2DisplayName, m.team2DisplayNameKo);
    if (m.winner == null || !m.team1Id || !m.team2Id) continue;
    const t1 = stats.get(m.team1Id);
    const t2 = stats.get(m.team2Id);
    if (!t1 || !t2) continue;

    if (m.winner === 1) {
      t1.w += 1;
      t2.l += 1;
    } else {
      t2.w += 1;
      t1.l += 1;
    }

    const setPairs = parseSetValues(m);
    for (const [g1, g2] of setPairs) {
      t1.gd += g1 - g2;
      t2.gd += g2 - g1;
      if (g1 > g2) {
        t1.sd += 1;
        t2.sd -= 1;
      } else if (g2 > g1) {
        t2.sd += 1;
        t1.sd -= 1;
      }
    }
  }

  const allRows = [...stats.values()];
  if (allRows.length < 2) return null;
  const explicitGroups = [...new Set(allRows.map((r) => r.group).filter(Boolean))].sort();
  const useGroups = explicitGroups.length > 1;
  const groups = useGroups ? explicitGroups : ["All"];
  const rowsByGroup: Record<string, PrelimsLeaderboardRow[]> = {};

  for (const g of groups) {
    const base = useGroups ? allRows.filter((r) => r.group === g) : allRows;
    const sorted = [...base].sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w;
      if (b.sd !== a.sd) return b.sd - a.sd;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return a.seed.localeCompare(b.seed) || a.player1.localeCompare(b.player1);
    });
    const ranked: PrelimsLeaderboardRow[] = [];
    let currentRank = 0;
    let prev: { w: number; sd: number; gd: number } | null = null;
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]!;
      if (!prev || row.w !== prev.w || row.sd !== prev.sd || row.gd !== prev.gd) {
        currentRank = i + 1;
        prev = { w: row.w, sd: row.sd, gd: row.gd };
      }
      ranked.push({ ...row, rank: currentRank });
    }
    rowsByGroup[g] = ranked;
  }
  return { groups, rowsByGroup };
}
