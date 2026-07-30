import { computeWinner, isCancelledMatch } from "@/lib/matches";

export type PrelimStats = { w: number; l: number; sd: number; gd: number; td: number };

type PrelimMatch = {
  matchStatus: string;
  team1Id: string | null;
  team2Id: string | null;
  set1ScoreTeam1: string | null; set2ScoreTeam1: string | null; set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null; set2ScoreTeam2: string | null; set3ScoreTeam2: string | null;
};

export function computePrelimStats(matches: PrelimMatch[]): Map<string, PrelimStats> {
  const stats = new Map<string, PrelimStats>();
  const ensure = (id: string | null) => { if (id && !stats.has(id)) stats.set(id, { w: 0, l: 0, sd: 0, gd: 0, td: 0 }); };

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

    ([
      [m.set1ScoreTeam1, m.set1ScoreTeam2],
      [m.set2ScoreTeam1, m.set2ScoreTeam2],
      [m.set3ScoreTeam1, m.set3ScoreTeam2],
    ] as Array<[string | null, string | null]>).forEach(([a, b], i) => {
      const n1 = a != null ? parseInt(a, 10) : NaN; const n2 = b != null ? parseInt(b, 10) : NaN;
      if (Number.isNaN(n1) || Number.isNaN(n2)) return;
      // Set 3 is the super tiebreak: it's still worth one set win/loss (sd),
      // but its raw point margin goes only into `td`, never into `gd`.
      const isSuperTiebreak = i === 2;
      if (n1 > n2) { t1.sd += 1; t2.sd -= 1; } else if (n2 > n1) { t2.sd += 1; t1.sd -= 1; }
      if (isSuperTiebreak) { t1.td += n1 - n2; t2.td += n2 - n1; }
      else { t1.gd += n1 - n2; t2.gd += n2 - n1; }
    });
  }
  return stats;
}

function winPctKey(s: PrelimStats): number {
  const played = s.w + s.l;
  return played === 0 ? -1 : s.w / played;
}

/** Buckets ids into groups of equal key value, sorted descending by key. */
function groupByDesc(ids: string[], keyFn: (id: string) => number): string[][] {
  const sorted = [...ids].sort((a, b) => keyFn(b) - keyFn(a));
  const buckets: string[][] = [];
  for (const id of sorted) {
    const last = buckets[buckets.length - 1];
    if (last && keyFn(last[0]) === keyFn(id)) last.push(id);
    else buckets.push([id]);
  }
  return buckets;
}

/** Recomputes stats restricted to only the matches played between members of `ids`. */
function subsetStats(matches: PrelimMatch[], ids: Set<string>): Map<string, PrelimStats> {
  const restricted = matches.filter(
    (m) => m.team1Id != null && m.team2Id != null && ids.has(m.team1Id) && ids.has(m.team2Id)
  );
  return computePrelimStats(restricted);
}

export type PrelimRankResult = { order: string[]; tiedGroups: string[][] };

/**
 * Orders teams per the tournament's tie-break priority:
 * 1. Win percentage
 * 2. Overall set difference
 * 3. Set difference among tied teams (head-to-head, recomputed for just the tied cluster)
 * 4. Overall game difference
 * 5. Game difference among tied teams (head-to-head, recomputed for just the tied cluster)
 * 6. Super-tiebreak point difference (0 if a team never played one)
 * 7. Drawing of lots — any cluster still tied after all of the above is resolved
 *    by `tiebreakOverrides` if every team in the cluster has one set (lower value
 *    ranks higher); otherwise it's returned in `tiedGroups` (order for those ids
 *    falls back to a stable id compare, since the real answer needs a manual draw).
 */
export function rankPrelimTeams(ids: string[], matches: PrelimMatch[], tiebreakOverrides?: Map<string, number>): PrelimRankResult {
  const stats = computePrelimStats(matches);
  for (const id of ids) if (!stats.has(id)) stats.set(id, { w: 0, l: 0, sd: 0, gd: 0, td: 0 });

  const resolveFinal = (bucket: string[]): PrelimRankResult => {
    if (bucket.length <= 1) return { order: bucket, tiedGroups: [] };
    const superTbBuckets = groupByDesc(bucket, (id) => stats.get(id)!.td);
    const order: string[] = []; const tiedGroups: string[][] = [];
    for (const b of superTbBuckets) {
      if (b.length > 1 && tiebreakOverrides && b.every((id) => tiebreakOverrides.has(id))) {
        // Every team in this still-tied cluster has a recorded manual
        // resolution (e.g. an actual drawing of lots) — use it instead of
        // flagging the tie. Lower override value ranks higher.
        order.push(...[...b].sort((a, c) => tiebreakOverrides.get(a)! - tiebreakOverrides.get(c)!));
        continue;
      }
      // Still tied after every real criterion — this is a genuine "drawing of
      // lots" case. No invented tiebreak here: keep the bucket's existing
      // (stable) order as-is and flag it, rather than fabricating a decision.
      order.push(...b);
      if (b.length > 1) tiedGroups.push(b);
    }
    return { order, tiedGroups };
  };

  const resolveByGameDiffAmongTied = (bucket: string[]): PrelimRankResult => {
    if (bucket.length <= 1) return { order: bucket, tiedGroups: [] };
    const sub = subsetStats(matches, new Set(bucket));
    const buckets = groupByDesc(bucket, (id) => sub.get(id)?.gd ?? 0);
    const order: string[] = []; const tiedGroups: string[][] = [];
    for (const b of buckets) {
      const r = resolveFinal(b);
      order.push(...r.order); tiedGroups.push(...r.tiedGroups);
    }
    return { order, tiedGroups };
  };

  const resolveByGameDiff = (bucket: string[]): PrelimRankResult => {
    if (bucket.length <= 1) return { order: bucket, tiedGroups: [] };
    const buckets = groupByDesc(bucket, (id) => stats.get(id)!.gd);
    const order: string[] = []; const tiedGroups: string[][] = [];
    for (const b of buckets) {
      const r = resolveByGameDiffAmongTied(b);
      order.push(...r.order); tiedGroups.push(...r.tiedGroups);
    }
    return { order, tiedGroups };
  };

  const resolveBySetDiffAmongTied = (bucket: string[]): PrelimRankResult => {
    if (bucket.length <= 1) return { order: bucket, tiedGroups: [] };
    const sub = subsetStats(matches, new Set(bucket));
    const buckets = groupByDesc(bucket, (id) => sub.get(id)?.sd ?? 0);
    const order: string[] = []; const tiedGroups: string[][] = [];
    for (const b of buckets) {
      const r = resolveByGameDiff(b);
      order.push(...r.order); tiedGroups.push(...r.tiedGroups);
    }
    return { order, tiedGroups };
  };

  const resolveBySetDiff = (bucket: string[]): PrelimRankResult => {
    if (bucket.length <= 1) return { order: bucket, tiedGroups: [] };
    const buckets = groupByDesc(bucket, (id) => stats.get(id)!.sd);
    const order: string[] = []; const tiedGroups: string[][] = [];
    for (const b of buckets) {
      const r = resolveBySetDiffAmongTied(b);
      order.push(...r.order); tiedGroups.push(...r.tiedGroups);
    }
    return { order, tiedGroups };
  };

  if (ids.length <= 1) return { order: ids, tiedGroups: [] };
  const winPctBuckets = groupByDesc(ids, (id) => winPctKey(stats.get(id)!));
  const order: string[] = []; const tiedGroups: string[][] = [];
  for (const bucket of winPctBuckets) {
    const r = resolveBySetDiff(bucket);
    order.push(...r.order); tiedGroups.push(...r.tiedGroups);
  }
  return { order, tiedGroups };
}

/** Returns a map of teamId → 1-based rank position across all teams in the given group. */
export function buildPrelimRankMap(ids: string[], matches: PrelimMatch[], tiebreakOverrides?: Map<string, number>): Map<string, number> {
  const { order } = rankPrelimTeams(ids, matches, tiebreakOverrides);
  const out = new Map<string, number>();
  order.forEach((id, i) => out.set(id, i + 1));
  return out;
}

/**
 * Live read-only mirror of the advancing rules in
 * `lib/generateMatches.ts`'s `autoFillKnockoutSlots` (GROUP_ROUND_ROBIN
 * branch): top 2 per seed group advance, plus the best 2 third-place
 * finishers when there are exactly 3 groups.
 *
 * A group's top 2 only become "advanced" once every match within that group
 * is decided (`Completed` or cancelled) — not the whole category, so groups
 * that finish early show their badges right away. The cross-group
 * "best thirds" tiebreak (e.g. 3 groups of 3 = 9 teams) can only be judged
 * once *every* group has finished, since it compares third-place finishers
 * against each other — so those badges wait for the whole category's prelim
 * matches to be decided.
 *
 * For an ungrouped (no-seed) `ROUND_ROBIN` category, whether 2 or 4 teams
 * advance is read off `hasSemis` — whether an SF round already exists in
 * this category's generated matches (set by `generateMatches()` at
 * creation time) — rather than re-derived from team count, so this always
 * agrees with whatever bracket shape was actually generated/played.
 *
 * Returns a map of teamId → 1-based global rank, restricted to only the
 * teams currently calculated to advance. A team's presence in the map is
 * itself the "advanced" signal. `tiedGroups` surfaces any clusters that
 * remain tied even after the super-tiebreak criterion — those need a
 * manual drawing of lots and shouldn't be presented as a firm rank.
 */
function groupTeamsBySeed(teamsWithSeed: { id: string; seed: string | null }[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const t of teamsWithSeed) {
    if (!t.seed?.trim()) continue;
    const g = t.seed.trim().toUpperCase();
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(t.id);
  }
  return groups;
}

export function computeAdvancingRanks(
  prelimMatches: PrelimMatch[],
  teamsWithSeed: { id: string; seed: string | null; withdrawn?: boolean; tiebreakOverride?: number | null }[],
  hasSemis: boolean,
): { ranks: Map<string, number>; tiedGroups: string[][] } {
  const groups = groupTeamsBySeed(teamsWithSeed);
  const isMatchDecided = (m: PrelimMatch) => isCancelledMatch(m.matchStatus) || computeWinner(m) != null;
  const withdrawnIds = new Set(teamsWithSeed.filter((t) => t.withdrawn).map((t) => t.id));
  const overrides = new Map(
    teamsWithSeed.filter((t): t is typeof t & { tiebreakOverride: number } => t.tiebreakOverride != null).map((t) => [t.id, t.tiebreakOverride])
  );

  if (groups.size === 0) {
    // Ungrouped round robin (no seeds): one table, so "complete" means every
    // match in the category has a result. Whether 4 or 2 advance follows
    // `hasSemis` (does an SF round already exist for this category) —
    // mirrors what `computeExpectedAdvancingCount` uses for this format.
    const allDecided = prelimMatches.length > 0 && prelimMatches.every(isMatchDecided);
    if (!allDecided) return { ranks: new Map(), tiedGroups: [] };
    const ids = teamsWithSeed.map((t) => t.id).filter((id) => !withdrawnIds.has(id));
    const advanceCount = hasSemis ? 4 : ids.length >= 2 ? 2 : 0;
    if (advanceCount === 0) return { ranks: new Map(), tiedGroups: [] };
    const { order, tiedGroups } = rankPrelimTeams(ids, prelimMatches, overrides);
    const advancing = order.slice(0, advanceCount);
    const out = new Map<string, number>();
    advancing.forEach((id, i) => out.set(id, i + 1));
    const advancingSet = new Set(advancing);
    return { ranks: out, tiedGroups: tiedGroups.filter((g) => g.some((id) => advancingSet.has(id))) };
  }

  const matchesForIds = (ids: string[]) => {
    const idSet = new Set(ids);
    return prelimMatches.filter((m) => (m.team1Id != null && idSet.has(m.team1Id)) || (m.team2Id != null && idSet.has(m.team2Id)));
  };
  const isGroupComplete = (ids: string[]) => {
    const matches = matchesForIds(ids);
    return matches.length > 0 && matches.every(isMatchDecided);
  };
  const allGroupsComplete = prelimMatches.length > 0 && prelimMatches.every(isMatchDecided);

  const advancing: string[] = [];
  const thirdPlace: string[] = [];
  const allTiedGroups: string[][] = [];
  for (const [, ids] of groups) {
    // Completeness is judged on the full group (including a withdrawn
    // team's matches, since those still need to be resolved), but a
    // withdrawn team is never itself a candidate to advance — the next-
    // ranked team in the group fills that slot instead.
    if (!isGroupComplete(ids)) continue;
    const eligibleIds = ids.filter((id) => !withdrawnIds.has(id));
    const { order: ranked, tiedGroups } = rankPrelimTeams(eligibleIds, prelimMatches, overrides);
    allTiedGroups.push(...tiedGroups);
    if (ranked[0]) advancing.push(ranked[0]);
    if (ranked[1]) advancing.push(ranked[1]);
    if (ranked[2]) thirdPlace.push(ranked[2]);
  }

  if (groups.size === 3 && allGroupsComplete && thirdPlace.length > 0) {
    const { order, tiedGroups } = rankPrelimTeams(thirdPlace, prelimMatches, overrides);
    allTiedGroups.push(...tiedGroups);
    advancing.push(...order.slice(0, 2));
  }

  const { order: globalRanked, tiedGroups: globalTied } = rankPrelimTeams(advancing, prelimMatches, overrides);
  allTiedGroups.push(...globalTied);
  const out = new Map<string, number>();
  globalRanked.forEach((id, i) => out.set(id, i + 1));
  const advancingSet = new Set(globalRanked);
  return { ranks: out, tiedGroups: allTiedGroups.filter((g) => g.some((id) => advancingSet.has(id))) };
}

/**
 * How many teams are expected to advance out of the prelim round for a
 * category, independent of how far the matches have actually progressed —
 * same group-count rules `computeAdvancingRanks` uses once matches decide
 * who those teams are (top 2 per seed group, plus the best 2 third-place
 * finishers when there are exactly 3 groups), and for the ungrouped
 * (no-seed) `ROUND_ROBIN` format, `hasSemis` (whether an SF round already
 * exists for this category) decides between 4 (semis) and 2 (straight to
 * the Final).
 */
export function computeExpectedAdvancingCount(
  teamsWithSeed: { id: string; seed: string | null; withdrawn?: boolean }[],
  hasSemis: boolean,
): number {
  const groups = groupTeamsBySeed(teamsWithSeed);
  if (groups.size === 0) {
    const n = teamsWithSeed.length;
    if (hasSemis) return 4;
    return n >= 2 ? 2 : 0;
  }
  return groups.size * 2 + (groups.size === 3 ? 2 : 0);
}
