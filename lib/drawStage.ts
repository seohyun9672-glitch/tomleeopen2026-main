import type { MatchWithTeamNames } from "@/lib/matches";
import { isPreRoundKnockoutFirstRound } from "@/lib/drawStructure";
import {
  MATCH_ROUND_BR,
  MATCH_ROUND_FINAL,
  MATCH_ROUND_PRE,
  MATCH_ROUND_QF,
  MATCH_ROUND_SF,
  normalizeMatchRoundCode,
} from "@/lib/matchRoundCode";

export type DrawStage = "prelims" | "qf" | "sf" | "final";
export type DrawKnockoutStage = Exclude<DrawStage, "prelims">;
export type KnockoutSubStage = "r16" | "qf" | "sf" | "final";

export const DRAW_STAGE_ORDER: readonly DrawStage[] = ["prelims", "qf", "sf", "final"];
export const DRAW_KNOCKOUT_STAGES: readonly DrawKnockoutStage[] = ["qf", "sf", "final"];

type MatchesByDrawStage = Record<DrawStage, MatchWithTeamNames[]>;

export type DrawStageData = {
  grouped: MatchesByDrawStage;
  availableStages: DrawStage[];
  availableKnockoutStages: DrawKnockoutStage[];
  isUnifiedKnockout: boolean;
  hasPrelims: boolean;
  hasKnockout: boolean;
  knockoutSubStages: KnockoutSubStage[];
  prelimMatches: MatchWithTeamNames[];
  qfMatches: MatchWithTeamNames[];
  sfMatches: MatchWithTeamNames[];
  bronzeMatches: MatchWithTeamNames[];
  finalMatches: MatchWithTeamNames[];
  finalsMatches: MatchWithTeamNames[];
};

function createEmptyGroupedStages(): MatchesByDrawStage {
  return {
    prelims: [],
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
  for (const match of matches) {
    const dateKey = matchDateKey(match.date);
    if (dateKey !== "" && dateKey <= today) return true;
  }
  return false;
}

function resolveDrawStageData(
  matchesOrData: MatchWithTeamNames[] | DrawStageData
): DrawStageData {
  return Array.isArray(matchesOrData) ? buildDrawStageData(matchesOrData) : matchesOrData;
}

export function buildDrawStageData(matches: MatchWithTeamNames[]): DrawStageData {
  const grouped = createEmptyGroupedStages();
  const bronzeMatches: MatchWithTeamNames[] = [];
  const finalMatches: MatchWithTeamNames[] = [];

  for (const match of matches) {
    switch (match.round) {
      case MATCH_ROUND_PRE:
        grouped.prelims.push(match);
        break;
      case MATCH_ROUND_QF:
        grouped.qf.push(match);
        break;
      case MATCH_ROUND_SF:
        grouped.sf.push(match);
        break;
      case MATCH_ROUND_BR:
        bronzeMatches.push(match);
        grouped.final.push(match);
        break;
      case MATCH_ROUND_FINAL:
        finalMatches.push(match);
        grouped.final.push(match);
        break;
      default:
        break;
    }
  }

  const prelimMatches = grouped.prelims;
  const qfMatches = grouped.qf;
  const sfMatches = grouped.sf;
  const finalStageMatches = grouped.final;

  const isUnifiedKnockout = isPreRoundKnockoutFirstRound(matches);

  const availableStagesSource = isUnifiedKnockout ? DRAW_KNOCKOUT_STAGES : DRAW_STAGE_ORDER;
  const availableStages = availableStagesSource.filter((stage) => grouped[stage].length > 0) as DrawStage[];
  const availableKnockoutStages = DRAW_KNOCKOUT_STAGES.filter((stage) => grouped[stage].length > 0);

  const knockoutSubStages: KnockoutSubStage[] = [];

  if (
    isUnifiedKnockout &&
    prelimMatches.some((match) => normalizeMatchRoundCode(match.round) === MATCH_ROUND_PRE)
  ) {
    knockoutSubStages.push("r16");
  }
  if (qfMatches.length > 0) knockoutSubStages.push("qf");
  if (sfMatches.length > 0) knockoutSubStages.push("sf");
  if (finalStageMatches.length > 0) knockoutSubStages.push("final");

  return {
    grouped,
    availableStages,
    availableKnockoutStages,
    isUnifiedKnockout,
    hasPrelims: prelimMatches.length > 0,
    hasKnockout: availableKnockoutStages.length > 0,
    knockoutSubStages,
    prelimMatches,
    qfMatches,
    sfMatches,
    bronzeMatches,
    finalMatches,
    finalsMatches: qfMatches.concat(sfMatches, finalStageMatches),
  };
}

export function getMatchesInDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  stage: DrawStage
): MatchWithTeamNames[] {
  return resolveDrawStageData(matchesOrData).grouped[stage];
}

/** Stages that have at least one match in this category. */
export function listAvailableDrawStages(matches: MatchWithTeamNames[]): DrawStage[] {
  return buildDrawStageData(matches).availableStages;
}

export function parseDrawStageParam(raw: string | null): DrawStage | null {
  if (!raw) return null;

  const value = raw.trim().toLowerCase();

  switch (value) {
    case "prelims":
    case "preliminaries":
      return "prelims";
    case "qf":
    case "quarterfinal":
    case "quarterfinals":
      return "qf";
    case "sf":
    case "semifinal":
    case "semifinals":
      return "sf";
    case "final":
    case "finals":
      return "final";
    default:
      return null;
  }
}

/**
 * Latest draw stage (prelims → final) that has at least one match with a scheduled date on or before `today`.
 * If no dated matches, returns the first available stage in order.
 */
export function computeDefaultDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string
): DrawStage {
  const data = resolveDrawStageData(matchesOrData);
  if (data.availableStages.length === 0) return "prelims";

  const availableStageSet = new Set<DrawStage>(data.availableStages);
  let best = data.availableStages[0]!;

  for (const stage of DRAW_STAGE_ORDER) {
    if (!availableStageSet.has(stage)) continue;
    if (stageHasStarted(data.grouped[stage], today)) best = stage;
  }

  return best;
}

/**
 * Latest knockout draw stage (QF → SF → Final) with a scheduled date on or before `today`, among stages that have data.
 */
export function computeDefaultKnockoutDrawStage(
  matchesOrData: MatchWithTeamNames[] | DrawStageData,
  today: string
): DrawKnockoutStage | null {
  const data = resolveDrawStageData(matchesOrData);
  if (data.availableKnockoutStages.length === 0) return null;

  const availableStageSet = new Set<DrawKnockoutStage>(data.availableKnockoutStages);
  let best = data.availableKnockoutStages[0]!;

  for (const stage of DRAW_KNOCKOUT_STAGES) {
    if (!availableStageSet.has(stage)) continue;
    if (stageHasStarted(data.grouped[stage], today)) best = stage;
  }

  return best;
}

export function isoDateLocal(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Knockout columns present in data, left to right. */
export function listKnockoutSubStages(matches: MatchWithTeamNames[]): KnockoutSubStage[] {
  return buildDrawStageData(matches).knockoutSubStages;
}

export function knockoutSubStageFromDrawStage(stage: DrawStage): KnockoutSubStage | null {
  return stage === "prelims" ? null : stage;
}

export function prevNextKnockoutSubStage(
  current: KnockoutSubStage,
  ordered: KnockoutSubStage[]
): { prev: KnockoutSubStage | null; next: KnockoutSubStage | null } {
  const index = ordered.indexOf(current);
  if (index < 0) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? ordered[index - 1]! : null,
    next: index < ordered.length - 1 ? ordered[index + 1]! : null,
  };
}