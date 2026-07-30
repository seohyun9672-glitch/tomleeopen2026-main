import { prisma } from "@/lib/prisma";
import { isCancelledMatch } from "@/lib/matches";
import { rankPrelimTeams } from "@/lib/prelim";

type TeamRow = { id: string; seed: string | null };

type MatchInsert = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  round: string;
  team1Id: string | null;
  team2Id: string | null;
  matchStatus: string;
};

export function derivePrelimFormat(teamCount: number): string {
  if (teamCount > 16) return "ELIMINATION";
  if (teamCount >= 6) return "GROUP_ROUND_ROBIN";
  return "ROUND_ROBIN";
}

function yy(year: number) {
  return String(year).slice(-2);
}

type MatchWithScores = {
  team1Id: string | null;
  team2Id: string | null;
  set1ScoreTeam1: string | null;
  set2ScoreTeam1: string | null;
  set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null;
  set2ScoreTeam2: string | null;
  set3ScoreTeam2: string | null;
};

function computeWinner(m: MatchWithScores): string | null {
  const sets = [
    [m.set1ScoreTeam1, m.set1ScoreTeam2],
    [m.set2ScoreTeam1, m.set2ScoreTeam2],
    [m.set3ScoreTeam1, m.set3ScoreTeam2],
  ] as const;
  let w1 = 0, w2 = 0;
  for (const [a, b] of sets) {
    const x = a ? +a : NaN, y = b ? +b : NaN;
    if (isNaN(x) || isNaN(y)) continue;
    if (x > y) w1++; else if (y > x) w2++;
  }
  if (w1 >= 2) return m.team1Id;
  if (w2 >= 2) return m.team2Id;
  return null;
}

// ── Main entry: load state, decide format, insert missing matches ─────────────

export async function generateMatches(
  tournamentYear: number,
  categoryId: string
): Promise<{ created: string[] }> {
  const [yearStatus, teams, existing, rounds] = await Promise.all([
    prisma.categoryYearStatus.findUnique({ where: { tournamentYear_categoryId: { tournamentYear, categoryId } }, select: { status: true, prelimFormat: true } }),
    prisma.team.findMany({ where: { tournamentYear, categoryId }, select: { id: true, seed: true } }),
    prisma.match.findMany({ where: { tournamentYear, categoryId }, select: { id: true, round: true, team1Id: true, team2Id: true } }),
    prisma.round.findMany({ select: { code: true } }),
  ]);

  if (yearStatus?.status !== "Active") return { created: [] };
  const format = yearStatus?.prelimFormat;
  if (!format) return { created: [] };
  if (teams.length < 2) return { created: [] };

  // GROUP_ROUND_ROBIN and ELIMINATION require all teams to have seeds
  if ((format === "GROUP_ROUND_ROBIN" || format === "ELIMINATION") && teams.some((t) => !t.seed)) {
    return { created: [] };
  }

  const existingIds = new Set(existing.map((m) => m.id));
  const validRoundCodes = new Set(rounds.map((r) => r.code));
  const prefix = yy(tournamentYear) + categoryId;
  const toInsert: MatchInsert[] = [];

  // Track existing PRE matches by sorted team pair to prevent duplicates when the format
  // changes (e.g. ROUND_ROBIN → GROUP_ROUND_ROBIN) after matches were already generated.
  const existingPrePairs = new Set<string>();
  for (const m of existing) {
    if (m.round === "PRE" && m.team1Id && m.team2Id) {
      const [a, b] = [m.team1Id, m.team2Id].sort();
      existingPrePairs.add(`${a}|${b}`);
    }
  }

  function slot(id: string, round: string, t1: string | null = null, t2: string | null = null) {
    if (existingIds.has(id)) return;
    if (!validRoundCodes.has(round)) return;
    if (round === "PRE" && t1 && t2) {
      const [a, b] = [t1, t2].sort();
      if (existingPrePairs.has(`${a}|${b}`)) return;
    }
    toInsert.push({ id, tournamentYear, categoryId, round, team1Id: t1, team2Id: t2, matchStatus: "Pending" });
  }

  if (format === "ROUND_ROBIN") {
    let n = 1;
    for (let i = 0; i < teams.length; i++)
      for (let j = i + 1; j < teams.length; j++)
        slot(`${prefix}PRE${n++}`, "PRE", teams[i].id, teams[j].id);
    if (teams.length === 5) {
      slot(`${prefix}SF1`, "SF");
      slot(`${prefix}SF2`, "SF");
      slot(`${prefix}F`, "F");
    } else {
      slot(`${prefix}F`, "F");
    }

  } else if (format === "GROUP_ROUND_ROBIN") {
    const groups = new Map<string, TeamRow[]>();
    for (const t of teams) {
      const g = t.seed!.toUpperCase();
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(t);
    }
    for (const [g, members] of groups) {
      let n = 1;
      for (let i = 0; i < members.length; i++)
        for (let j = i + 1; j < members.length; j++)
          slot(`${prefix}PRE${g}${n++}`, "PRE", members[i].id, members[j].id);
    }
    // Generate empty knockout slots based on expected advancing team count
    let advancingCount = groups.size * 2;
    if (groups.size === 3) advancingCount += 2; // best 2 thirds
    if (advancingCount >= 8) {
      for (let n = 1; n <= 4; n++) slot(`${prefix}QF${n}`, "QF");
      for (let n = 1; n <= 2; n++) slot(`${prefix}SF${n}`, "SF");
      slot(`${prefix}F`, "F");
    } else if (advancingCount >= 4) {
      for (let n = 1; n <= 2; n++) slot(`${prefix}SF${n}`, "SF");
      slot(`${prefix}F`, "F");
    } else if (advancingCount >= 2) {
      slot(`${prefix}F`, "F");
    }

  } else if (format === "ELIMINATION") {
    // 16+ teams; sort by numeric seed and pair 1 vs last, 2 vs 2nd-last
    const sorted = [...teams].sort((a, b) => parseInt(a.seed ?? "9999") - parseInt(b.seed ?? "9999"));
    const firstRound = sorted.length >= 32 ? "R32" : "R16";
    const pairs = Math.floor(sorted.length / 2);
    for (let n = 1; n <= pairs; n++)
      slot(`${prefix}${firstRound}${n}`, firstRound, sorted[n - 1].id, sorted[sorted.length - n].id);
    // Empty subsequent rounds
    const r16Count = firstRound === "R32" ? 8 : 0;
    if (r16Count > 0) for (let n = 1; n <= r16Count; n++) slot(`${prefix}R16${n}`, "R16");
    for (let n = 1; n <= 4; n++) slot(`${prefix}QF${n}`, "QF");
    for (let n = 1; n <= 2; n++) slot(`${prefix}SF${n}`, "SF");
    slot(`${prefix}F`, "F");
  }

  if (toInsert.length === 0) return { created: [] };
  await prisma.match.createMany({ data: toInsert, skipDuplicates: true });
  return { created: toInsert.map((m) => m.id) };
}

// ── Auto-fill knockout slots when all prelims in a group complete ─────────────

/**
 * A next-round match is "locked" once it has actually started — completed,
 * cancelled, or has any set score recorded. Locked matches are never
 * overwritten even if the freshly-computed ranking would seed them
 * differently; only a still-`Pending`, no-score slot gets (re)synced. This
 * is what keeps already-played brackets (e.g. past tournament years) safe
 * without needing any year-specific special-casing.
 */
function isMatchLocked(m: {
  matchStatus: string;
  set1ScoreTeam1: string | null; set2ScoreTeam1: string | null; set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null; set2ScoreTeam2: string | null; set3ScoreTeam2: string | null;
}): boolean {
  return (
    m.matchStatus === "Completed" ||
    isCancelledMatch(m.matchStatus) ||
    m.set1ScoreTeam1 != null || m.set2ScoreTeam1 != null || m.set3ScoreTeam1 != null ||
    m.set1ScoreTeam2 != null || m.set2ScoreTeam2 != null || m.set3ScoreTeam2 != null
  );
}

export async function autoFillKnockoutSlots(
  tournamentYear: number,
  categoryId: string,
  format: string
): Promise<{ updated: string[]; blocked: string[]; pendingTies: string[] }> {
  const [allMatches, allTeams] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentYear, categoryId },
      select: {
        id: true, team1Id: true, team2Id: true, matchStatus: true, round: true,
        set1ScoreTeam1: true, set2ScoreTeam1: true, set3ScoreTeam1: true,
        set1ScoreTeam2: true, set2ScoreTeam2: true, set3ScoreTeam2: true,
      },
    }),
    prisma.team.findMany({ where: { tournamentYear, categoryId }, select: { id: true, seed: true, withdrawn: true, tiebreakOverride: true } }),
  ]);
  const withdrawnIds = new Set(allTeams.filter((t) => t.withdrawn).map((t) => t.id));
  const overrides = new Map(
    allTeams.filter((t): t is typeof t & { tiebreakOverride: number } => t.tiebreakOverride != null).map((t) => [t.id, t.tiebreakOverride])
  );

  const prelims = allMatches.filter((m) => m.round === "PRE");
  const updated: string[] = [];
  const blocked: string[] = [];
  const pendingTies: string[] = [];

  const prefix = yy(tournamentYear) + categoryId;

  // Writes (or blocks) a next-round slot's teams: skipped entirely if the
  // match already started. If the ranking feeding this slot is still
  // genuinely tied (needs a manual drawing of lots), the slot is cleared
  // back to empty rather than guessing a pairing — any team ids it was
  // previously (wrongly) filled with are undone here.
  async function syncSlot(matchId: string, round: string, newT1: string | null, newT2: string | null, tied: boolean) {
    const existing = allMatches.find((m) => m.id === matchId);
    if (existing && isMatchLocked(existing)) {
      if (existing.team1Id !== newT1 || existing.team2Id !== newT2) blocked.push(matchId);
      return;
    }
    if (tied) {
      pendingTies.push(matchId);
      if (existing?.team1Id != null || existing?.team2Id != null) {
        await prisma.match.update({ where: { id: matchId }, data: { team1Id: null, team2Id: null } });
      }
      return;
    }
    if (existing?.team1Id === newT1 && existing?.team2Id === newT2) return;
    await prisma.match.upsert({
      where: { id: matchId },
      update: { team1Id: newT1, team2Id: newT2 },
      create: { id: matchId, tournamentYear, categoryId, round, team1Id: newT1, team2Id: newT2, matchStatus: "Pending" },
    });
    updated.push(matchId);
  }

  if (format === "GROUP_ROUND_ROBIN") {
    const groups = new Map<string, string[]>();
    for (const t of allTeams) {
      if (!t.seed) continue;
      const g = t.seed.toUpperCase();
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(t.id);
    }

    // Wait until ALL prelims across all groups are completed
    if (prelims.some((m) => m.matchStatus !== "Completed" && !isCancelledMatch(m.matchStatus))) return { updated, blocked, pendingTies };

    // Rank within each group; collect advancing teams and third-place finishers.
    // Same-group teams always have real head-to-head data (they play each other
    // in PRE), so a within-group tie needing a manual draw is not checked here —
    // only the final cross-group seeding step below can produce a genuine tie.
    const advancing: string[] = [];
    const thirdPlace: string[] = [];
    for (const [, ids] of groups) {
      // A withdrawn team is never a candidate to advance — the next-ranked
      // team in the group fills that slot instead.
      const ranked = rankPrelimTeams(ids, prelims, overrides).order.filter((id) => !withdrawnIds.has(id));
      if (ranked[0]) advancing.push(ranked[0]);
      if (ranked[1]) advancing.push(ranked[1]);
      if (ranked[2]) thirdPlace.push(ranked[2]);
    }

    // For 3 groups: add the best 2 third-place finishers to reach 8
    if (groups.size === 3 && thirdPlace.length > 0) {
      advancing.push(...rankPrelimTeams(thirdPlace, prelims, overrides).order.slice(0, 2));
    }

    const nextRound = advancing.length >= 8 ? "QF" : advancing.length >= 4 ? "SF" : "F";
    const { order: globalRanked, tiedGroups } = rankPrelimTeams(advancing, prelims, overrides);
    const anyTie = tiedGroups.length > 0;
    const n = globalRanked.length;

    for (let i = 0; i < Math.floor(n / 2); i++) {
      const matchId = nextRound === "F" ? `${prefix}F` : `${prefix}${nextRound}${i + 1}`;
      await syncSlot(matchId, nextRound, globalRanked[i], globalRanked[n - 1 - i], anyTie);
    }
  } else if (format === "ROUND_ROBIN") {
    if (prelims.some((m) => m.matchStatus !== "Completed" && !isCancelledMatch(m.matchStatus))) return { updated, blocked, pendingTies };

    const allIds = allTeams.map((t) => t.id).filter((id) => !withdrawnIds.has(id));
    const { order: ranked, tiedGroups } = rankPrelimTeams(allIds, prelims, overrides);
    const anyTie = tiedGroups.length > 0;

    if (allTeams.length === 5) {
      if (ranked.length < 4) return { updated, blocked, pendingTies };

      const sf1Id = `${prefix}SF1`;
      const sf2Id = `${prefix}SF2`;
      const finalId = `${prefix}F`;

      await syncSlot(sf1Id, "SF", ranked[0], ranked[3], anyTie);
      await syncSlot(sf2Id, "SF", ranked[1], ranked[2], anyTie);

      const existingF = allMatches.find((m) => m.id === finalId);
      if (!existingF) {
        await prisma.match.upsert({
          where: { id: finalId },
          update: {},
          create: { id: finalId, tournamentYear, categoryId, round: "F", team1Id: null, team2Id: null, matchStatus: "Pending" },
        });
      }
    } else {
      if (ranked.length < 2) return { updated, blocked, pendingTies };
      const finalId = `${prefix}F`;
      await syncSlot(finalId, "F", ranked[0], ranked[1], anyTie);
    }
  }

  return { updated, blocked, pendingTies };
}

// ── Advance knockout winner to next round slot ────────────────────────────────

const NEXT_ROUND: Record<string, string> = { R32: "R16", R16: "QF", QF: "SF", SF: "F" };

export async function autoAdvanceKnockout(
  matchId: string,
  tournamentYear: number,
  categoryId: string
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      round: true, team1Id: true, team2Id: true, matchStatus: true,
      set1ScoreTeam1: true, set2ScoreTeam1: true, set3ScoreTeam1: true,
      set1ScoreTeam2: true, set2ScoreTeam2: true, set3ScoreTeam2: true,
    },
  });
  if (!match || match.matchStatus !== "Completed") return;

  const nextRound = NEXT_ROUND[match.round ?? ""];
  if (!nextRound) return;

  const w = computeWinner(match);
  if (!w) return;

  // Extract n from match ID by stripping "{YY}{categoryId}{roundCode}"
  const prefix = yy(tournamentYear) + categoryId;
  const n = parseInt(matchId.slice(prefix.length + (match.round ?? "").length));
  if (isNaN(n)) return;

  const nextMatchId = nextRound === "F"
    ? `${prefix}F`
    : `${prefix}${nextRound}${Math.ceil(n / 2)}`;
  const isTeam1 = n % 2 === 1;

  const nextMatch = await prisma.match.findUnique({
    where: { id: nextMatchId },
    select: { team1Id: true, team2Id: true },
  });
  if (!nextMatch) return;

  if (isTeam1 && !nextMatch.team1Id)
    await prisma.match.update({ where: { id: nextMatchId }, data: { team1Id: w } });
  else if (!isTeam1 && !nextMatch.team2Id)
    await prisma.match.update({ where: { id: nextMatchId }, data: { team2Id: w } });
}
