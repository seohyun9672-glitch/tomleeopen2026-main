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

