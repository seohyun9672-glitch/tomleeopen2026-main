import { prisma } from "@/lib/prisma";
import { cache } from "react";

/** Partner clubs shown on the site: only these five. DB codes are matched case-insensitively. */
const PARTNER_CLUB_CODES = new Set(["CTC", "CLAYTON", "VKTC", "HARANG", "LANGLEY"]);

function normalizeClubCode(code: string): string {
  const upper = code.toUpperCase();
  // Historical alias: FVKTC was previously used for the Langley club.
  if (upper === "FVKTC") return "LANGLEY";
  return upper;
}

export interface PartnerClub {
  slug: string;
  name: string;
  nameKo: string | null;
  description: string;
  logo: string | null;
}

/**
 * Partner clubs for home / nav — one small `Club` query only (no PlayerClub join).
 * Cached per request so multiple helpers don’t repeat work.
 */
export const getPartnerClubs = cache(async function getPartnerClubs(): Promise<PartnerClub[]> {
  const clubs = await prisma.club.findMany({
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, nameKo: true, description: true, logo: true },
  });
  const allowed = clubs.filter((c) => PARTNER_CLUB_CODES.has(normalizeClubCode(c.code)));
  return allowed.map((c) => ({
    slug: c.code.toLowerCase(),
    name: c.name ?? c.code,
    nameKo: c.nameKo ?? null,
    description: c.description ?? "Partner club description. Add your club info here.",
    logo: c.logo ?? null,
  }));
});

export async function getPartnerClubBySlug(slug: string): Promise<PartnerClub | undefined> {
  const clubs = await getPartnerClubs();
  return clubs.find((c) => c.slug === slug);
}

export async function getPartnerClubSlugs(): Promise<string[]> {
  const clubs = await getPartnerClubs();
  return clubs.map((c) => c.slug);
}
