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

export const getClubs = cache(async function getClubs(): Promise<ClubInfo[]> {
  const rows = await prisma.club.findMany({
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, nameKo: true, description: true, logo: true },
  });
  return rows.map((c) => ({
    slug: c.code.toLowerCase(),
    name: c.name ?? c.code,
    nameKo: c.nameKo ?? null,
    description: c.description ?? null,
    logo: c.logo ?? null,
  }));
});

export async function getClubBySlug(slug: string): Promise<ClubInfo | undefined> {
  const clubs = await getClubs();
  return clubs.find((c) => c.slug === slug);
}

export async function getClubSlugs(): Promise<string[]> {
  const clubs = await getClubs();
  return clubs.map((c) => c.slug);
}
