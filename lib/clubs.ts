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

const DEFAULT_CLUB_CHIP_SURFACE =
  "border-0 bg-[var(--club-chip-default-bg)] text-[var(--club-chip-default-text)]";

export const CLUB_CHIP_PRESETS = {
  harang: {
    variant: "harang" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-harang-bg)] text-[var(--club-chip-harang-text)]",
  },
  vktc: {
    variant: "vktc" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-vktc-bg)] text-[var(--club-chip-vktc-text)]",
  },
  ctc: {
    variant: "ctc" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-ctc-bg)] text-[var(--club-chip-ctc-text)]",
  },
  clayton: {
    variant: "clayton" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-clayton-bg)] text-[var(--club-chip-clayton-text)]",
  },
  sagol: {
    variant: "sagol" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-sagol-bg)] text-[var(--club-chip-sagol-text)]",
  },
  machang: {
    variant: "machang" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-machang-bg)] text-[var(--club-chip-machang-text)]",
  },
  langley: {
    variant: "langley" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-langley-bg)] text-[var(--club-chip-langley-text)]",
  },
  na: {
    variant: "na" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-na-bg)] text-[var(--club-chip-na-text)]",
  },
} as const;

export type ClubChipVariant = keyof typeof CLUB_CHIP_PRESETS;

export function clubChipClass(clubCode: string): string {
  const key = clubCode.trim().toLowerCase();
  const colorKey = key === "n/a" || key === "na" ? "na" : key;
  const preset = CLUB_CHIP_PRESETS[colorKey as ClubChipVariant];
  return preset?.chipSurfaceClass ?? DEFAULT_CLUB_CHIP_SURFACE;
}

export function clubDisplayName(
  club: { name: string; nameKo: string | null },
  locale: import("@/lib/content").Locale
): string {
  return locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name;
}
