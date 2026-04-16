/** Single stored/display code for “no club” — merges legacy `NA` and `N/A` variants. */
export const CANONICAL_NO_CLUB_CODE = "N/A";

function isNoClubAlias(code: string): boolean {
  const compact = code.trim().toLowerCase().replace(/\s+/g, "");
  return compact === "na" || compact === "n/a";
}

/** Normalize `NA` / `N/A` (any casing/spacing) to {@link CANONICAL_NO_CLUB_CODE}; other codes unchanged. */
export function canonicalizeClubCode(code: string): string {
  const t = code.trim();
  if (!t) return t;
  if (isNoClubAlias(t)) return CANONICAL_NO_CLUB_CODE;
  return t;
}

/** Parse JSON `clubs` array: trim, canonicalize N/A aliases, dedupe while preserving order. */
export function parseClubCodesFromBody(clubs: unknown): string[] {
  if (!Array.isArray(clubs)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of clubs) {
    if (typeof c !== "string") continue;
    const raw = c.trim();
    if (!raw) continue;
    const code = canonicalizeClubCode(raw);
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}
