import { prisma } from "@/lib/prisma";

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
  if (teamCount >= 16) return "ELIMINATION";
  if (teamCount >= 6) return "GROUP_ROUND_ROBIN";
  return "ROUND_ROBIN";
}

function yy(year: number) {
  return String(year).slice(-2);
}

// ── Main entry: load state, decide format, insert missing matches ─────────────

export async function generateMatches(
  tournamentYear: number,
  categoryId: string
): Promise<{ created: string[] }> {
  const [category, yearStatus, teams, existing, rounds] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { prelimFormat: true } }),
    prisma.categoryYearStatus.findUnique({ where: { tournamentYear_categoryId: { tournamentYear, categoryId } }, select: { status: true } }),
    prisma.team.findMany({ where: { tournamentYear, categoryId }, select: { id: true, seed: true } }),
    prisma.match.findMany({ where: { tournamentYear, categoryId }, select: { id: true } }),
    prisma.round.findMany({ select: { code: true } }),
  ]);

  if (yearStatus?.status !== "Active") return { created: [] };
  const format = category?.prelimFormat;
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

  function slot(id: string, round: string, t1: string | null = null, t2: string | null = null) {
    if (existingIds.has(id)) return;
    if (!validRoundCodes.has(round)) return;
    toInsert.push({ id, tournamentYear, categoryId, round, team1Id: t1, team2Id: t2, matchStatus: "Scheduled" });
  }

  if (format === "ROUND_ROBIN") {
    let n = 1;
    for (let i = 0; i < teams.length; i++)
      for (let j = i + 1; j < teams.length; j++)
        slot(`${prefix}PRE${n++}`, "PRE", teams[i].id, teams[j].id);
    slot(`${prefix}F`, "F");

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
    const groupCount = groups.size;
    const advancing = groupCount * 2;
    if (advancing >= 8) for (let n = 1; n <= 4; n++) slot(`${prefix}QF${n}`, "QF");
    if (advancing >= 4) for (let n = 1; n <= 2; n++) slot(`${prefix}SF${n}`, "SF");
    slot(`${prefix}F`, "F");

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

// ── Auto-fill knockout slots when a prelim match completes ───────────────────

export async function autoFillKnockoutSlots(
  tournamentYear: number,
  categoryId: string,
  format: string
): Promise<{ updated: string[] }> {
  const [allMatches, allTeams] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentYear, categoryId },
      select: {
        id: true, team1Id: true, team2Id: true, matchStatus: true, round: true,
        set1ScoreTeam1: true, set2ScoreTeam1: true, set3ScoreTeam1: true,
        set1ScoreTeam2: true, set2ScoreTeam2: true, set3ScoreTeam2: true,
      },
    }),
    prisma.team.findMany({ where: { tournamentYear, categoryId }, select: { id: true, seed: true } }),
  ]);

  const prelims = allMatches.filter((m) => m.round === "PRE");
  const updated: string[] = [];

  function winner(m: (typeof allMatches)[number]): string | null {
    const s = [[m.set1ScoreTeam1, m.set1ScoreTeam2], [m.set2ScoreTeam1, m.set2ScoreTeam2], [m.set3ScoreTeam1, m.set3ScoreTeam2]] as const;
    let w1 = 0, w2 = 0;
    for (const [a, b] of s) {
      const x = a ? +a : NaN, y = b ? +b : NaN;
      if (isNaN(x) || isNaN(y)) continue;
      if (x > y) w1++; else if (y > x) w2++;
    }
    if (w1 >= 2) return m.team1Id;
    if (w2 >= 2) return m.team2Id;
    return null;
  }

  function rank(matches: typeof prelims, ids: string[]) {
    const s = new Map(ids.map((id) => [id, { id, wins: 0, losses: 0 }]));
    for (const m of matches) {
      if (m.matchStatus !== "Completed") continue;
      const w = winner(m);
      const l = w === m.team1Id ? m.team2Id : m.team1Id;
      if (w && s.has(w)) s.get(w)!.wins++;
      if (l && s.has(l)) s.get(l)!.losses++;
    }
    return [...s.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }

  if (format === "GROUP_ROUND_ROBIN") {
    const groups = new Map<string, string[]>();
    for (const t of allTeams) {
      if (!t.seed) continue;
      const g = t.seed.toUpperCase();
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(t.id);
    }
    const tops: Array<{ group: string; first: string; second: string }> = [];
    for (const [g, ids] of groups) {
      const gPrelims = prelims.filter((m) => (m.team1Id && ids.includes(m.team1Id)) || (m.team2Id && ids.includes(m.team2Id)));
      const ranked = rank(gPrelims, ids);
      if (ranked.length >= 2) tops.push({ group: g, first: ranked[0].id, second: ranked[1].id });
    }
    if (tops.length < 2) return { updated };
    tops.sort((a, b) => a.group.localeCompare(b.group));
    const qfs = allMatches.filter((m) => m.round === "QF");
    for (let i = 0; i < tops.length; i++) {
      const opp = tops[(i + 1) % tops.length];
      const qf = qfs[i];
      if (!qf || qf.team1Id || qf.team2Id) continue;
      await prisma.match.update({ where: { id: qf.id }, data: { team1Id: tops[i].first, team2Id: opp.second } });
      updated.push(qf.id);
    }
  } else if (format === "ROUND_ROBIN") {
    const ranked = rank(prelims, allTeams.map((t) => t.id));
    if (ranked.length < 2) return { updated };
    const final = allMatches.find((m) => m.round === "F");
    if (final && !final.team1Id && !final.team2Id) {
      await prisma.match.update({ where: { id: final.id }, data: { team1Id: ranked[0].id, team2Id: ranked[1].id } });
      updated.push(final.id);
    }
  }

  return { updated };
}
