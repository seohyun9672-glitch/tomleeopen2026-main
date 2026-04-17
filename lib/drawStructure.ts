import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";

/** Minimal fields for structural classification (avoids importing `lib/matches` → circular deps). */
export type DrawStructureMatch = {
  round: { code: string } | null;
  team1Id: string | null;
  team2Id: string | null;
  matchStatus: string;
};

function excludedFromKnockoutStructureMatch(matchStatus: string): boolean {
  const s = matchStatus.trim().toLowerCase();
  return s === "cancelled";
}

export function isPreRoundKnockoutFirstRound(matches: readonly DrawStructureMatch[]): boolean {
  // Explicit R16 round always means a unified knockout structure.
  const hasExplicitR16 = matches.some(
    (m) =>
      !excludedFromKnockoutStructureMatch(m.matchStatus ?? "") && m.round?.code === ROUND_R16
  );
  if (hasExplicitR16) return true;

  // Structural check: Pre matches where every team appears exactly once → R16 bracket.
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
