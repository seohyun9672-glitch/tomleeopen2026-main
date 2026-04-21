import type { MatchWithTeamNames } from "@/lib/matches";
import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";

export type DrawStage = "pre" | "r16" | "qf" | "sf" | "final";
export type DrawKnockoutStage = Exclude<DrawStage, "pre">;
export type KnockoutSubStage = "r16" | "qf" | "sf" | "final";

type MatchesByDrawStage = Record<DrawStage, MatchWithTeamNames[]>;

export type DrawStageData = {
  grouped: MatchesByDrawStage;
  availableStages: DrawStage[];
  availableKnockoutStages: DrawKnockoutStage[];
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
export const DRAW_KNOCKOUT_STAGES: readonly DrawKnockoutStage[] = ["r16", "qf", "sf", "final"];

export const DRAW_STAGE_ROUND_CODE: Record<DrawStage, string> = {
  pre: ROUND_PRE,
  r16: ROUND_R16,
  qf: ROUND_QF,
  sf: ROUND_SF,
  final: ROUND_F,
};

const ROUND_CODE_TO_STAGE: Partial<Record<string, DrawStage>> = {
  [ROUND_PRE]: "pre",
  [ROUND_R16]: "r16",
  [ROUND_QF]: "qf",
  [ROUND_SF]: "sf",
  [ROUND_F]: "final",
};


function createEmptyGroupedStages(): MatchesByDrawStage {
  return {
    pre: [],
    r16: [],
    qf: [],
    sf: [],
    final: [],
  };
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

function getAvailableKnockoutStages(grouped: MatchesByDrawStage): DrawKnockoutStage[] {
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
): DrawKnockoutStage | null {
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

export function buildPrelimRankMap(matches: MatchWithTeamNames[]): Map<string, number> {
  const prelims = matches.filter((m) => m.round?.code === ROUND_PRE);
  if (prelims.length === 0) return new Map();

  type Stats = { w: number; sd: number; gd: number };
  const stats = new Map<string, Stats>();

  function ensure(id: string | null) {
    if (id && !stats.has(id)) stats.set(id, { w: 0, sd: 0, gd: 0 });
  }

  for (const m of prelims) {
    ensure(m.team1Id);
    ensure(m.team2Id);
    if (m.winner == null || !m.team1Id || !m.team2Id) continue;
    const t1 = stats.get(m.team1Id)!;
    const t2 = stats.get(m.team2Id)!;
    if (m.winner === 1) { t1.w += 1; } else { t2.w += 1; }
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

  const sorted = [...stats.entries()].sort(([, a], [, b]) =>
    b.w !== a.w ? b.w - a.w : b.sd !== a.sd ? b.sd - a.sd : b.gd - a.gd,
  );

  const out = new Map<string, number>();
  let rank = 0;
  let prev: Stats | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const [id, s] = sorted[i]!;
    if (!prev || s.w !== prev.w || s.sd !== prev.sd || s.gd !== prev.gd) {
      rank = i + 1;
      prev = s;
    }
    out.set(id, rank);
  }
  return out;
}
