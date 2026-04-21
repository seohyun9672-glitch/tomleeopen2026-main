export type RoundInfo = {
  id: number;
  code: string;
  labelEn: string;
  labelKo: string;
  sortOrder: number;
};

// Round code constants matching the seeded Round.code values.
export const ROUND_PRE = "PRE";
export const ROUND_R16 = "R16";
export const ROUND_QF  = "QF";
export const ROUND_SF  = "SF";
export const ROUND_F   = "F";

/**
 * Whether a number should be shown for a given round context.
 * - No `isLoser`: header match number — show for all rounds except Final.
 * - With `isLoser`: rank badge — all players in knockout rounds get the number.
 */
export function showNumber(round: RoundInfo | null, isLoser?: boolean): boolean {
  const code = round?.code;
  if (isLoser === undefined) return code !== ROUND_F;
  return code === ROUND_R16 || code === ROUND_QF || code === ROUND_SF || code === ROUND_F;
}