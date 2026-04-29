// ─── Club code parsing ────────────────────────────────────────────────────────

export function parseClubCodesFromBody(clubs: unknown): string[] {
  if (!Array.isArray(clubs)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of clubs) {
    if (typeof c !== "string") continue;
    const code = c.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export type ClubRecord = {
  id: string;
  code: string;
  sortOrder: number;
};

// ─── Chip styles ──────────────────────────────────────────────────────────────

export function clubChipClass(clubCode: string): string {
  const key = clubCode.trim().toLowerCase();
  return `border-0 club-chip-${key === "n/a" ? "na" : key}`;
}

export function clubDisplayName(
  club: { name: string; nameKo: string | null },
  locale: import("@/lib/content").Locale
): string {
  return locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name;
}
