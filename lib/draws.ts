import type { MatchWithTeamNames } from "@/lib/matches";
import { isCancelledMatch } from "@/lib/matches";
import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";

export type DrawStage = "pre" | "r16" | "qf" | "sf" | "final";
export type KnockoutSubStage = "r16" | "qf" | "sf" | "final";

type MatchesByDrawStage = Record<DrawStage, MatchWithTeamNames[]>;

type DrawStageData = {
  grouped: MatchesByDrawStage;
  availableStages: DrawStage[];
  availableKnockoutStages: KnockoutSubStage[];
  hasPre: boolean;
  hasKnockout: boolean;
  knockoutSubStages: KnockoutSubStage[];
  prelimMatches: MatchWithTeamNames[];
  r16Matches: MatchWithTeamNames[];
  qfMatches: MatchWithTeamNames[];
  sfMatches: MatchWithTeamNames[];
  finalMatches: MatchWithTeamNames[];
  finalsMatches: MatchWithTeamNames[];
};

export const DRAW_STAGE_ORDER: readonly DrawStage[] = ["pre", "r16", "qf", "sf", "final"];
const DRAW_KNOCKOUT_STAGES: readonly KnockoutSubStage[] = ["r16", "qf", "sf", "final"];

const ROUND_CODE_TO_STAGE: Partial<Record<string, DrawStage>> = {
  [ROUND_PRE]: "pre",
  [ROUND_R16]: "r16",
  [ROUND_QF]: "qf",
  [ROUND_SF]: "sf",
  [ROUND_F]: "final",
};

function createEmptyGroupedStages(): MatchesByDrawStage {
  return { pre: [], r16: [], qf: [], sf: [], final: [] };
}

function matchDateKey(dateStr: string | null | undefined): string {
  const value = (dateStr ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function stageHasStarted(matches: MatchWithTeamNames[], today: string): boolean {
  return matches.some((match) => {
    const dateKey = matchDateKey(match.date);
    return dateKey !== "" && dateKey <= today;
  });
}

function resolveDrawStageData(matchesOrData: MatchWithTeamNames[] | DrawStageData): DrawStageData {
  return Array.isArray(matchesOrData) ? buildDrawStageData(matchesOrData) : matchesOrData;
}

function getAvailableStages(grouped: MatchesByDrawStage): DrawStage[] {
  return DRAW_STAGE_ORDER.filter((stage) => grouped[stage].length > 0);
}

function getAvailableKnockoutStages(grouped: MatchesByDrawStage): KnockoutSubStage[] {
  return DRAW_KNOCKOUT_STAGES.filter((stage) => grouped[stage].length > 0);
}

function getKnockoutSubStages(
  r16Matches: MatchWithTeamNames[],
  qfMatches: MatchWithTeamNames[],
  sfMatches: MatchWithTeamNames[],
  finalMatches: MatchWithTeamNames[],
): KnockoutSubStage[] {
  const stages: KnockoutSubStage[] = [];
  if (r16Matches.length > 0) stages.push("r16");
  if (qfMatches.length > 0) stages.push("qf");
  if (sfMatches.length > 0) stages.push("sf");
  if (finalMatches.length > 0) stages.push("final");
  return stages;
}

function computeLatestStartedStage<TStage extends DrawStage>(
  orderedStages: readonly TStage[],
  availableStages: TStage[],
  grouped: Record<TStage, MatchWithTeamNames[]>,
  today: string,
): TStage | null {
  if (availableStages.length === 0) return null;

  let latestStarted: TStage | null = null;

  for (const stage of orderedStages) {
    if (!availableStages.includes(stage)) continue;
    if (stageHasStarted(grouped[stage], today)) {
      latestStarted = stage;
    }
  }

  return latestStarted ?? availableStages[0] ?? null;
}

export function buildDrawStageData(matches: MatchWithTeamNames[]): DrawStageData {
  const grouped = createEmptyGroupedStages();

  for (const match of matches) {
    const roundCode = match.round?.code;
    const stage = roundCode ? ROUND_CODE_TO_STAGE[roundCode] : undefined;
    if (!stage) continue;
    grouped[stage].push(match);
  }

  const prelimMatches = grouped.pre;
  const r16Matches = grouped.r16;
  const qfMatches = grouped.qf;
  const sfMatches = grouped.sf;
  const finalMatches = grouped.final;

  const availableStages = getAvailableStages(grouped);
  const availableKnockoutStages = getAvailableKnockoutStages(grouped);
  const knockoutSubStages = getKnockoutSubStages(r16Matches, qfMatches, sfMatches, finalMatches);

  return {
    grouped,
    availableStages,
    availableKnockoutStages,
    hasPre: prelimMatches.length > 0,
    hasKnockout: availableKnockoutStages.length > 0,
    knockoutSubStages,
    prelimMatches,
    r16Matches,
    qfMatches,
    sfMatches,
    finalMatches,
    finalsMatches: [...r16Matches, ...qfMatches, ...sfMatches, ...finalMatches],
  };
}

export function computeDefaultDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string,
): DrawStage {
  const data = resolveDrawStageData(matchesOrData);

  return (
    computeLatestStartedStage(
      DRAW_STAGE_ORDER,
      data.availableStages,
      data.grouped,
      today,
    ) ?? "pre"
  );
}

export function computeDefaultKnockoutDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string,
): KnockoutSubStage | null {
  const data = resolveDrawStageData(matchesOrData);

  return computeLatestStartedStage(
    DRAW_KNOCKOUT_STAGES,
    data.availableKnockoutStages,
    data.grouped,
    today,
  );
}

export function isoDateLocal(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function knockoutSubStageFromDrawStage(stage: DrawStage): KnockoutSubStage | null {
  return stage === "pre" ? null : stage;
}

// ─── Prelim stats ─────────────────────────────────────────────────────────────

export type PrelimTeamStats = { w: number; l: number; sd: number; gd: number };

function handleCancelledMatch(
  stats: Map<string, PrelimTeamStats>,
  team1Id: string | null | undefined,
  team2Id: string | null | undefined,
) {
  const t1 = team1Id ? stats.get(team1Id) : null;
  const t2 = team2Id ? stats.get(team2Id) : null;
  // Both teams receive a forfeit loss: 0-6, 0-6
  if (t1) { t1.l += 1; t1.sd -= 2; t1.gd -= 12; }
  if (t2) { t2.l += 1; t2.sd -= 2; t2.gd -= 12; }
}

export function computePrelimStats(matches: MatchWithTeamNames[]): Map<string, PrelimTeamStats> {
  const prelims = matches.filter((m) => m.round?.code === ROUND_PRE);
  const stats = new Map<string, PrelimTeamStats>();

  function ensure(id: string | null) {
    if (id && !stats.has(id)) stats.set(id, { w: 0, l: 0, sd: 0, gd: 0 });
  }

  for (const m of prelims) {
    ensure(m.team1Id);
    ensure(m.team2Id);
    if (isCancelledMatch(m.matchStatus)) {
      handleCancelledMatch(stats, m.team1Id, m.team2Id);
      continue;
    }
    if (m.winner == null || !m.team1Id || !m.team2Id) continue;
    const t1 = stats.get(m.team1Id)!;
    const t2 = stats.get(m.team2Id)!;
    if (m.winner === 1) { t1.w += 1; t2.l += 1; } else { t2.w += 1; t1.l += 1; }
    const pairs: Array<[string | null, string | null]> = [
      [m.set1ScoreTeam1, m.set1ScoreTeam2],
      [m.set2ScoreTeam1, m.set2ScoreTeam2],
      [m.set3ScoreTeam1, m.set3ScoreTeam2],
    ];
    for (const [a, b] of pairs) {
      const n1 = a != null ? parseInt(a, 10) : NaN;
      const n2 = b != null ? parseInt(b, 10) : NaN;
      if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
      t1.gd += n1 - n2; t2.gd += n2 - n1;
      if (n1 > n2) { t1.sd += 1; t2.sd -= 1; } else if (n2 > n1) { t2.sd += 1; t1.sd -= 1; }
    }
  }

  return stats;
}

export function buildPrelimRankMap(matches: MatchWithTeamNames[]): Map<string, number> {
  const stats = computePrelimStats(matches);
  if (stats.size === 0) return new Map();

  const sorted = [...stats.keys()].sort((a, b) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return sb.w !== sa.w ? sb.w - sa.w : sb.sd !== sa.sd ? sb.sd - sa.sd : sb.gd - sa.gd;
  });

  const out = new Map<string, number>();
  sorted.forEach((id, i) => out.set(id, i + 1));
  return out;
}
