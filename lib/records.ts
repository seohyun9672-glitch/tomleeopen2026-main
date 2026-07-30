import type { Match } from "@/lib/matches";
import { computeWinner } from "@/lib/matches";
import type { CategoryRecord } from "@/lib/categories";
import type { TeamRecord } from "@/lib/teams";

export type TeamMemberMap = Map<string, { member1PlayerId: number; member2PlayerId: number | null }>;

export type PlayerRecordStats = { wins: number; losses: number };

export type PlayerTitle = {
  tournamentYear: number;
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  tier: string | null;
  tierKo: string | null;
};

/** teamId -> {member1PlayerId, member2PlayerId}, the join needed to attribute a match's winner/loser to individual players. */
export function buildTeamMemberMap(teams: TeamRecord[]): TeamMemberMap {
  const map: TeamMemberMap = new Map();
  for (const t of teams) {
    map.set(t.id, { member1PlayerId: t.member1PlayerId, member2PlayerId: t.member2PlayerId });
  }
  return map;
}

function playersOnTeam(teamId: string | null, teamMembers: TeamMemberMap): number[] {
  if (!teamId) return [];
  const t = teamMembers.get(teamId);
  if (!t) return [];
  return t.member2PlayerId ? [t.member1PlayerId, t.member2PlayerId] : [t.member1PlayerId];
}

/**
 * Career win/loss counts per player. Same winner determination as
 * `computePrelimStats` (via `computeWinner`), just attributed to both
 * members of the winning/losing team instead of the team itself, and over
 * every match instead of prelim-only.
 */
export function computePlayerRecords(matches: Match[], teamMembers: TeamMemberMap): Map<number, PlayerRecordStats> {
  const stats = new Map<number, PlayerRecordStats>();
  const ensure = (id: number) => {
    if (!stats.has(id)) stats.set(id, { wins: 0, losses: 0 });
    return stats.get(id)!;
  };

  for (const m of matches) {
    const winner = computeWinner(m);
    if (winner == null) continue;
    const winningTeamId = winner === 1 ? m.team1Id : m.team2Id;
    const losingTeamId = winner === 1 ? m.team2Id : m.team1Id;
    for (const id of playersOnTeam(winningTeamId, teamMembers)) ensure(id).wins += 1;
    for (const id of playersOnTeam(losingTeamId, teamMembers)) ensure(id).losses += 1;
  }
  return stats;
}

/**
 * Final-round wins per player, same pattern as `getFinalistPlayerKeys` in
 * `lib/matches.ts` (round code "F" + a determined winner), extended to
 * return the title's display details instead of a flat key set.
 */
export function computePlayerTitles(
  matches: Match[],
  teamMembers: TeamMemberMap,
  categoriesById: Map<string, CategoryRecord>,
): Map<number, PlayerTitle[]> {
  const out = new Map<number, PlayerTitle[]>();
  for (const m of matches) {
    if (m.round?.code !== "F") continue;
    const winner = computeWinner(m);
    if (winner == null) continue;
    const winningTeamId = winner === 1 ? m.team1Id : m.team2Id;
    const cat = categoriesById.get(m.categoryId);
    const title: PlayerTitle = {
      tournamentYear: m.tournamentYear,
      categoryId: m.categoryId,
      categoryLabel: cat?.category ?? m.categoryDisplayLabel ?? m.categoryId,
      categoryLabelKo: cat?.categoryKo ?? m.categoryDisplayLabelKo ?? null,
      tier: cat?.tier ?? null,
      tierKo: cat?.tierKo ?? null,
    };
    for (const id of playersOnTeam(winningTeamId, teamMembers)) {
      if (!out.has(id)) out.set(id, []);
      out.get(id)!.push(title);
    }
  }
  return out;
}

/** Distinct categoryIds a player has appeared in across every match. */
export function buildPlayerCategoryIds(matches: Match[], teamMembers: TeamMemberMap): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  for (const m of matches) {
    const playerIds = new Set([...playersOnTeam(m.team1Id, teamMembers), ...playersOnTeam(m.team2Id, teamMembers)]);
    for (const id of playerIds) {
      if (!out.has(id)) out.set(id, new Set());
      out.get(id)!.add(m.categoryId);
    }
  }
  return out;
}

/** All matches a player appeared in (either team), grouped by tournamentYear. */
export function buildPlayerMatchHistory(matches: Match[], teamMembers: TeamMemberMap): Map<number, Map<number, Match[]>> {
  const out = new Map<number, Map<number, Match[]>>();
  for (const m of matches) {
    const playerIds = new Set([...playersOnTeam(m.team1Id, teamMembers), ...playersOnTeam(m.team2Id, teamMembers)]);
    for (const id of playerIds) {
      if (!out.has(id)) out.set(id, new Map());
      const byYear = out.get(id)!;
      if (!byYear.has(m.tournamentYear)) byYear.set(m.tournamentYear, []);
      byYear.get(m.tournamentYear)!.push(m);
    }
  }
  return out;
}
