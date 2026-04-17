import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";

export const MATCH_ID_ROUND_CODES = ["PRE", "R16", "QF", "SF", "F"] as const;
export type MatchIdRoundCode = (typeof MATCH_ID_ROUND_CODES)[number];

/**
 * Map Round.code → compact segment used inside `Match.id`.
 * "Pre" → "PRE{letter}", "R16" → "R16", "QF" → "QF", "SF" → "SF", "F" → "F".
 */
export function dbRoundToMatchIdRoundCode(code: string | null | undefined): string {
  switch ((code ?? "").trim()) {
    case ROUND_PRE: return "PRE";
    case ROUND_R16: return "R16";
    case ROUND_QF:  return "QF";
    case ROUND_SF:  return "SF";
    case ROUND_F:   return "F";
    default: {
      const r = (code ?? "").trim();
      if (!r) return "UNK";
      return r.replace(/\s+/g, "").toUpperCase().slice(0, 4);
    }
  }
}

/** True when the id format requires a prelims seed letter (Pre rounds only). */
export function matchIdUsesPrelimsSeedLetter(code: string | null | undefined): boolean {
  return (code ?? "").trim() === ROUND_PRE;
}

/**
 * Normalizes pool / seed input to a single **A–Z** letter.
 * Accepts `A`, `Pool B`, `Group A`, `1`–`26` → A–Z.
 */
export function normalizePrelimsSeedLetter(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) {
    throw new Error("prelimsSeedLetter is required for Pre round ids (e.g. A, B or pool label)");
  }
  const tokens = s.split(/\s+/).filter(Boolean);
  for (const t of [...tokens].reverse()) {
    if (/^[A-Za-z]$/.test(t)) return t.toUpperCase();
  }
  const digits = s.match(/^\d+$/);
  if (digits) {
    const n = parseInt(s, 10);
    if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
  }
  const m = s.match(/[A-Za-z]/);
  if (m) {
    const c = m[0].toUpperCase();
    if (c >= "A" && c <= "Z") return c;
  }
  throw new Error(`Invalid prelimsSeedLetter: "${raw}" (use A–Z, pool name with a letter, or 1–26)`);
}

/** Two-digit year suffix for IDs (e.g. 2024 → `24`, 2005 → `05`). */
export function matchIdYearSuffix(tournamentYear: number): string {
  const y = Math.trunc(tournamentYear);
  const yy = ((y % 100) + 100) % 100;
  return String(yy).padStart(2, "0");
}

export type BuildMatchIdOptions = {
  /** Required for Pre rounds — one capital seed/pool letter between `PRE` and `matchNumber`. */
  prelimsSeedLetter?: string | null;
};

/** Build a `Match.id` string from year, category, round code, and match number. */
export function buildMatchId(
  tournamentYear: number,
  categoryId: string,
  roundCode: string | null | undefined,
  matchNumber: number,
  options?: BuildMatchIdOptions
): string {
  const cat = categoryId.trim();
  if (!cat) throw new Error("categoryId is required");
  const n = Math.trunc(matchNumber);
  if (!Number.isFinite(n) || n < 1) throw new Error("matchNumber must be a positive integer");

  const idCode = dbRoundToMatchIdRoundCode(roundCode);
  let roundSegment: string;
  if (idCode === "PRE") {
    const letter = normalizePrelimsSeedLetter(options?.prelimsSeedLetter);
    roundSegment = `PRE${letter}`;
  } else {
    roundSegment = idCode;
  }

  return `${matchIdYearSuffix(tournamentYear)}${cat}${roundSegment}${n}`;
}
