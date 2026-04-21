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

/** Returns the display label for a round code. */
export function roundLabel(code: string | null | undefined, locale: "en" | "ko"): string {
  switch ((code ?? "").trim()) {
    case ROUND_PRE: return locale === "ko" ? "예선" : "Preliminaries";
    case ROUND_R16: return locale === "ko" ? "16강" : "Round of 16";
    case ROUND_QF:  return locale === "ko" ? "준준결승" : "Quarterfinals";
    case ROUND_SF:  return locale === "ko" ? "준결승" : "Semifinals";
    case ROUND_F:   return locale === "ko" ? "결승" : "Final";
    default: return "";
  }
}

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