import { prisma } from "@/lib/prisma";
// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all coaches ordered by sortOrder then name. */
export async function getCoaches() {
  if (!prisma.coach) return [];
  return prisma.coach.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, fullNameKo: true, phone: true, image: true, sortOrder: true },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Visible name on cards (English UI — primary `name`). */
export function coachDisplayName(coach: { name: string; fullNameKo: string | null }): string {
  return coach.name.trim();
}

/** Normalize image path for Next.js Image: public paths must start with /. */
export function normalizeImagePath(path: string | null): string | null {
  if (!path || typeof path !== "string" || !path.trim()) return null;
  const p = path.trim();
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("/")) return p;
  return `/${p}`;
}