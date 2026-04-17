export type RoundInfo = {
  id: number;
  code: string;
  labelEn: string;
  labelKo: string;
  sortOrder: number;
};

// Round code constants matching the seeded Round.code values.
export const ROUND_PRE = "Pre";
export const ROUND_R16 = "R16";
export const ROUND_QF  = "QF";
export const ROUND_SF  = "SF";
export const ROUND_F   = "F";

/** Hide match-number badge only for the Final. */
export function showPublicMatchNumberBadge(round: RoundInfo | null): boolean {
  return round?.code !== ROUND_F;
}

export type AdminSortableMatch = {
  round: RoundInfo | null;
  matchNumber: number | null;
  id?: string;
};

/** Admin default rank: newest round first (descending sortOrder). */
function adminRank(round: RoundInfo | null): number {
  return round ? 99 - round.sortOrder : 999;
}

export function compareMatchesAdminDefaultOrder(
  a: AdminSortableMatch,
  b: AdminSortableMatch
): number {
  const rankDiff = adminRank(a.round) - adminRank(b.round);
  if (rankDiff !== 0) return rankDiff;

  const matchNumberDiff = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  if (matchNumberDiff !== 0) return matchNumberDiff;

  return (a.id ?? "").localeCompare(b.id ?? "", undefined, { sensitivity: "base" });
}

export function sortMatchesAdminDefault<T extends AdminSortableMatch>(list: readonly T[]): T[] {
  return [...list].sort(compareMatchesAdminDefaultOrder);
}
