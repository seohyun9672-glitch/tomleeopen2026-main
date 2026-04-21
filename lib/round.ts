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