import type { MatchRound } from "@prisma/client";
import { normalizeMatchRoundCode } from "@/lib/matchRoundCode";
export const MATCH_ID_ROUND_CODES = ["PRE", "QF", "SF", "F"] as const;
export type MatchIdRoundCode = (typeof MATCH_ID_ROUND_CODES)[number];

/** Map DB `Match.round` (Prisma {@link MatchRound}) → compact segment used inside `Match.id` (before prelims seed letter). */
export function dbRoundToMatchIdRoundCode(round: MatchRound | string | null | undefined): string {
  const c = normalizeMatchRoundCode(round);
  if (c === "PRE") return "PRE";
  if (c === "QF") return "QF";
  if (c === "SF") return "SF";
  if (c === "FINAL") return "F";
  if (c === "BR") return "BR";
  const r = (round ?? "").trim();
  if (!r) return "UNK";
  return r.replace(/\s+/g, "").toUpperCase().slice(0, 4);
}

/** True when the id format uses a prelims seed letter before `matchNumber`. */
export function matchIdUsesPrelimsSeedLetter(dbRound: MatchRound | string | null | undefined): boolean {
  return normalizeMatchRoundCode(dbRound) === "PRE";
}

/**
 * Normalizes pool / seed input to a single **A–Z** letter.
 * Accepts `A`, `Pool B`, `Group A` (uses a single-letter token if present), `1`–`26` → A–Z.
 */
export function normalizePrelimsSeedLetter(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) {
    throw new Error("prelimsSeedLetter is required for Prelims/R16 ids (e.g. A, B or pool label)");
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
  /** Required for `Prelims` / `R16` — one capital seed/pool letter between `PRE` and `matchNumber`. */
  prelimsSeedLetter?: string | null;
};

/**
 * Infer prelims pool letter from linked teams when migrating legacy rows.
 * - Seeds like `A1` / `Pool B` → letter from {@link normalizePrelimsSeedLetter}.
 * - **Numeric-only** seeds (draw rank, e.g. `1`–`5`) → **`A`** (single implicit pool / RR).
 * - Missing seeds → **`A`**.
 */
export function derivePrelimsSeedLetterForMigration(
  seed1: string | null | undefined,
  seed2: string | null | undefined
): string {
  const a = (seed1 ?? "").trim();
  const b = (seed2 ?? "").trim();
  const numOnly = (x: string) => x.length > 0 && /^\d+$/.test(x);
  const pickRaw = (): string => {
    if (!numOnly(a) && a) return a;
    if (!numOnly(b) && b) return b;
    return a || b;
  };
  const raw = pickRaw();
  if (!raw || numOnly(raw)) return "A";
  return normalizePrelimsSeedLetter(raw);
}

/**
 * Build a `Match.id` string from year, category, DB round label, and match number.
 */
export function buildMatchId(
  tournamentYear: number,
  categoryId: string,
  dbRound: MatchRound | string | null | undefined,
  matchNumber: number,
  options?: BuildMatchIdOptions
): string {
  const cat = categoryId.trim();
  if (!cat) throw new Error("categoryId is required");
  const n = Math.trunc(matchNumber);
  if (!Number.isFinite(n) || n < 1) throw new Error("matchNumber must be a positive integer");

  const roundCode = dbRoundToMatchIdRoundCode(dbRound);
  let roundSegment: string;
  if (roundCode === "PRE") {
    const letter = normalizePrelimsSeedLetter(options?.prelimsSeedLetter);
    roundSegment = `PRE${letter}`;
  } else {
    roundSegment = roundCode;
  }

  return `${matchIdYearSuffix(tournamentYear)}${cat}${roundSegment}${n}`;
}
