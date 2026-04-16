import { MATCH_ROUND_PRE, normalizeMatchRoundCode, isKnockoutPhaseRound } from "@/lib/matchRoundCode";

/** Minimal fields for structural classification (avoids importing `lib/matches` → circular deps). */
export type DrawStructureMatch = {
  round: string | null;
  team1Id: string | null;
  team2Id: string | null;
  matchStatus: string;
};

function excludedFromKnockoutStructureMatch(matchStatus: string): boolean {
  const s = matchStatus.trim().toLowerCase();
  return s === "cancelled";
}

export function isPreRoundKnockoutFirstRound(matches: readonly DrawStructureMatch[]): boolean {
  const preMatches = [];
  let hasLaterKnockout = false;

  for (const m of matches) {
    if (excludedFromKnockoutStructureMatch(m.matchStatus ?? "")) continue;

    const round = normalizeMatchRoundCode(m.round);

    if (round === MATCH_ROUND_PRE) {
      preMatches.push(m);
    } else if (isKnockoutPhaseRound(m.round)) {
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
