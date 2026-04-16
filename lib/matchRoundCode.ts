import type { MatchRound } from "@prisma/client";

export type MatchRoundCode = MatchRound;

export const MATCH_ROUND_PRE = "PRE" satisfies MatchRound;
export const MATCH_ROUND_QF = "QF" satisfies MatchRound;
export const MATCH_ROUND_SF = "SF" satisfies MatchRound;
export const MATCH_ROUND_FINAL = "FINAL" satisfies MatchRound;
export const MATCH_ROUND_BR = "BR" satisfies MatchRound;

export const MATCH_ROUND_CODES = [
  MATCH_ROUND_PRE,
  MATCH_ROUND_QF,
  MATCH_ROUND_SF,
  MATCH_ROUND_BR,
  MATCH_ROUND_FINAL,
] as const satisfies readonly MatchRound[];

const MATCH_ROUND_CODE_SET = new Set<string>(MATCH_ROUND_CODES);

const CANONICAL_ROUND_ORDER = {
  PRE: 0,
  QF: 1,
  SF: 2,
  BR: 3,
  FINAL: 4,
} as const satisfies Record<MatchRoundCode, number>;

const ADMIN_ROUND_ORDER = {
  FINAL: 0,
  BR: 1,
  SF: 2,
  QF: 3,
  PRE: 4,
} as const satisfies Record<MatchRoundCode, number>;

const LEGACY_TO_CANONICAL: Record<string, MatchRound> = {
  PRE: MATCH_ROUND_PRE,
  QF: MATCH_ROUND_QF,
  SF: MATCH_ROUND_SF,
  FINAL: MATCH_ROUND_FINAL,
  BR: MATCH_ROUND_BR,
  prelims: MATCH_ROUND_PRE,
  Prelims: MATCH_ROUND_PRE,
  R16: MATCH_ROUND_PRE,
  qf: MATCH_ROUND_QF,
  sf: MATCH_ROUND_SF,
  final: MATCH_ROUND_FINAL,
  Final: MATCH_ROUND_FINAL,
  bronze: MATCH_ROUND_BR,
  Bronze: MATCH_ROUND_BR,
};

const KNOCKOUT_PHASE_SET = new Set<string>([
  MATCH_ROUND_QF,
  MATCH_ROUND_SF,
  MATCH_ROUND_BR,
  MATCH_ROUND_FINAL,
]);

export function normalizeMatchRoundCode(raw: string | null | undefined): MatchRound | null {
  const value = raw?.trim();
  if (!value) return null;

  return (
    LEGACY_TO_CANONICAL[value] ??
    (MATCH_ROUND_CODE_SET.has(value.toUpperCase()) ? (value.toUpperCase() as MatchRound) : null)
  );
}

export function matchRoundForPrisma(raw: string | null | undefined): MatchRound | null {
  return normalizeMatchRoundCode(raw);
}

export function isKnockoutPhaseRound(round: string | null | undefined): boolean {
  const normalized = normalizeMatchRoundCode(round);
  return normalized !== null && KNOCKOUT_PHASE_SET.has(normalized);
}

export function canonicalMatchRoundOrRaw(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return normalizeMatchRoundCode(value) ?? value;
}

export function showPublicMatchNumberBadge(round: string | null | undefined): boolean {
  return normalizeMatchRoundCode(round) !== MATCH_ROUND_FINAL;
}

export function isMatchRoundCode(value: string | null | undefined): value is MatchRoundCode {
  return value !== null && value !== undefined && MATCH_ROUND_CODE_SET.has(value);
}

export function matchRoundSortRank(round: string | null | undefined): number {
  const normalized = normalizeMatchRoundCode(round);
  if (normalized) return CANONICAL_ROUND_ORDER[normalized];
  return round?.trim() ? 2 : -1;
}

export function matchRoundAdminDefaultRank(round: string | null | undefined): number {
  const normalized = normalizeMatchRoundCode(round);
  if (normalized) return ADMIN_ROUND_ORDER[normalized];
  return round?.trim() ? 100 : 999;
}

export type MatchRoundSortableRow = {
  round: string | null;
  matchNumber: number | null;
  id?: string;
};

export function compareMatchesAdminDefaultOrder(a: MatchRoundSortableRow, b: MatchRoundSortableRow): number {
  const roundDiff = matchRoundAdminDefaultRank(a.round) - matchRoundAdminDefaultRank(b.round);
  if (roundDiff !== 0) return roundDiff;

  const matchNumberDiff = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  if (matchNumberDiff !== 0) return matchNumberDiff;

  return (a.id ?? "").localeCompare(b.id ?? "", undefined, { sensitivity: "base" });
}

export function sortMatchesAdminDefault<T extends MatchRoundSortableRow>(list: readonly T[]): T[] {
  return [...list].sort(compareMatchesAdminDefaultOrder);
}