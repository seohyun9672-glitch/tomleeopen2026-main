import { prisma } from "@/lib/prisma";
import { cache } from "react";

// ─── Club code parsing (used by registration forms) ───────────────────────────

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

// ─── Chip / display helpers ───────────────────────────────────────────────────

export function clubChipClass(clubCode: string): string {
  const key = clubCode.trim().toLowerCase();
  return `border-0 club-chip-${key === "n/a" ? "na" : key}`;
}

// Mirrors the `.club-chip-*` rules in app/globals.css ("CLUB CHIP COLORS") —
// same club → pastel-family mapping, but returning a CSS color value (for
// chart fills, etc.) instead of a class name.
const CLUB_COLOR_FAMILY: Record<string, string> = {
  harang: "sky",
  vktc: "mint",
  ctc: "lilac",
  clayton: "butter",
  sagol: "peach",
  machang: "aqua",
  langley: "pink",
  na: "slate",
};

/** Returns the `var(--pastel-*-fg)` color matching a club's chip color (see `clubChipClass`). */
export function clubChipColorVar(clubCode: string): string {
  const key = clubCode.trim().toLowerCase();
  const family = CLUB_COLOR_FAMILY[key === "n/a" ? "na" : key] ?? CLUB_COLOR_FAMILY.na;
  return `var(--pastel-${family}-fg)`;
}

export function clubDisplayName(
  club: { name: string; nameKo: string | null },
  locale: import("@/lib/content").Locale
): string {
  return locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name;
}

// ─── DB queries ───────────────────────────────────────────────────────────────

export type ClubInfo = {
  slug: string;
  name: string;
  nameKo: string | null;
  description: string | null;
  logo: string | null;
};

function nonEmpty(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = value.trim();
  return t && t.toUpperCase() !== "N/A" ? t : null;
}

export const getClubs = cache(async function getClubs(): Promise<ClubInfo[]> {
  const rows = await prisma.club.findMany({
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, nameKo: true, description: true, logo: true },
  });
  return rows.map((c) => ({
    slug: c.code.toLowerCase(),
    name: nonEmpty(c.name) ?? c.code,
    nameKo: nonEmpty(c.nameKo),
    description: nonEmpty(c.description),
    logo: nonEmpty(c.logo),
  }));
});

export async function getClubSlugs(): Promise<string[]> {
  const clubs = await getClubs();
  return clubs.map((c) => c.slug);
}
