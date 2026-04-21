import type { MatchWithTeamNames } from "@/lib/matches";
import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";

// ─── Draw structure classification ───────────────────────────────────────────

export type DrawStructureMatch = {
  round: { code: string } | null;
  team1Id: string | null;
  team2Id: string | null;
  matchStatus: string;
};

function excludedFromKnockoutStructureMatch(matchStatus: string): boolean {
  return matchStatus.trim().toLowerCase() === "cancelled";
}

export function isPreRoundKnockoutFirstRound(matches: readonly DrawStructureMatch[]): boolean {
  const hasExplicitR16 = matches.some(
    (m) => !excludedFromKnockoutStructureMatch(m.matchStatus ?? "") && m.round?.code === ROUND_R16
  );
  if (hasExplicitR16) return true;

  const preMatches: DrawStructureMatch[] = [];
  let hasLaterKnockout = false;

  for (const m of matches) {
    if (excludedFromKnockoutStructureMatch(m.matchStatus ?? "")) continue;
    const code = m.round?.code;
    if (code === ROUND_PRE) {
      preMatches.push(m);
    } else if (code === ROUND_QF || code === ROUND_SF || code === ROUND_F) {
      hasLaterKnockout = true;
    }
  }

  if (preMatches.length === 0 || !hasLaterKnockout) return false;

  const seen = new Set<string>();
  for (const m of preMatches) {
    const t1 = m.team1Id?.trim();
    const t2 = m.team2Id?.trim();
    if (!t1 || !t2) return false;
    if (seen.has(t1) || seen.has(t2)) return false;
    seen.add(t1);
    seen.add(t2);
  }

  return preMatches.length * 2 === seen.size;
}

// ─── Draw stage types ─────────────────────────────────────────────────────────

export type DrawKnockoutStage = Exclude<DrawStage, "prelims">;
export type KnockoutSubStage = "r16" | "qf" | "sf" | "final";
export type DrawStage = "prelims" | "qf" | "sf" | "final";
export type RoundCode = typeof ROUND_PRE | typeof ROUND_R16 | typeof ROUND_QF | typeof ROUND_SF | typeof ROUND_F;

type MatchesByDrawStage = Record<DrawStage, MatchWithTeamNames[]>;

export type DrawStageData = {
  grouped: MatchesByDrawStage;
  availableStages: DrawStage[];
  availableKnockoutStages: DrawKnockoutStage[];
  isUnifiedKnockout: boolean;
  hasPrelims: boolean;
  hasKnockout: boolean;
  knockoutSubStages: KnockoutSubStage[];
  r16Matches: MatchWithTeamNames[];
  prelimMatches: MatchWithTeamNames[];
  qfMatches: MatchWithTeamNames[];
  sfMatches: MatchWithTeamNames[];
  finalMatches: MatchWithTeamNames[];
  finalsMatches: MatchWithTeamNames[];
};

export const DRAW_STAGE_ORDER: readonly DrawStage[] = ["prelims", "qf", "sf", "final"];
export const DRAW_KNOCKOUT_STAGES: readonly DrawKnockoutStage[] = ["qf", "sf", "final"];

const ROUND_CODE_TO_STAGE: Partial<Record<string, DrawStage>> = {
  [ROUND_PRE]: "prelims",
  [ROUND_R16]: "prelims",
  [ROUND_QF]: "qf",
  [ROUND_SF]: "sf",
  [ROUND_F]: "final",
};

function createEmptyGroupedStages(): MatchesByDrawStage {
  return { prelims: [], qf: [], sf: [], final: [] };
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

function getAvailableStages(grouped: MatchesByDrawStage, isUnifiedKnockout: boolean): DrawStage[] {
  const source = isUnifiedKnockout ? DRAW_KNOCKOUT_STAGES : DRAW_STAGE_ORDER;
  return source.filter((stage) => grouped[stage].length > 0) as DrawStage[];
}

function getAvailableKnockoutStages(grouped: MatchesByDrawStage): DrawKnockoutStage[] {
  return DRAW_KNOCKOUT_STAGES.filter((stage) => grouped[stage].length > 0);
}

function getKnockoutSubStages(
  isUnifiedKnockout: boolean,
  qfMatches: MatchWithTeamNames[],
  sfMatches: MatchWithTeamNames[],
  finalMatches: MatchWithTeamNames[],
): KnockoutSubStage[] {
  const stages: KnockoutSubStage[] = [];
  if (isUnifiedKnockout) stages.push("r16");
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

  const availableStageSet = new Set<TStage>(availableStages);
  let best = availableStages[0]!;

  for (const stage of orderedStages) {
    if (!availableStageSet.has(stage)) continue;
    if (stageHasStarted(grouped[stage], today)) {
      best = stage;
    }
  }

  return best;
}

export function buildDrawStageData(matches: MatchWithTeamNames[]): DrawStageData {
  const grouped = createEmptyGroupedStages();
  const r16Matches: MatchWithTeamNames[] = [];

  for (const match of matches) {
    const roundCode = match.round?.code;
    const stage = roundCode ? ROUND_CODE_TO_STAGE[roundCode] : undefined;
    if (!stage) continue;
    grouped[stage].push(match);
    if (roundCode === ROUND_R16) r16Matches.push(match);
  }

  const prelimMatches = grouped.prelims;
  const qfMatches = grouped.qf;
  const sfMatches = grouped.sf;
  const finalMatches = grouped.final;

  const isUnifiedKnockout = isPreRoundKnockoutFirstRound(matches);
  const availableStages = getAvailableStages(grouped, isUnifiedKnockout);
  const availableKnockoutStages = getAvailableKnockoutStages(grouped);
  const knockoutSubStages = getKnockoutSubStages(isUnifiedKnockout, qfMatches, sfMatches, finalMatches);

  return {
    grouped,
    availableStages,
    availableKnockoutStages,
    isUnifiedKnockout,
    hasPrelims: prelimMatches.length > 0,
    hasKnockout: availableKnockoutStages.length > 0,
    knockoutSubStages,
    r16Matches,
    prelimMatches,
    qfMatches,
    sfMatches,
    finalMatches,
    finalsMatches: [...qfMatches, ...sfMatches, ...finalMatches],
  };
}

export function computeDefaultDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string,
): DrawStage {
  const data = resolveDrawStageData(matchesOrData);

  if (data.isUnifiedKnockout) {
    return computeDefaultKnockoutDrawStage(data, today) ?? "qf";
  }

  return (
    computeLatestStartedStage(DRAW_STAGE_ORDER, data.availableStages, data.grouped, today) ?? "prelims"
  );
}

export function computeDefaultKnockoutDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string,
): DrawKnockoutStage | null {
  const data = resolveDrawStageData(matchesOrData);
  return computeLatestStartedStage(DRAW_KNOCKOUT_STAGES, data.availableKnockoutStages, data.grouped, today);
}

export function isoDateLocal(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function knockoutSubStageFromDrawStage(stage: DrawStage): KnockoutSubStage | null {
  return stage === "prelims" ? null : stage;
}
