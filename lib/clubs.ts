import { prisma } from "@/lib/prisma";

export type ClubRecord = {
  id: string;
  code: string;
  sortOrder: number;
};

type PrismaWithClub = typeof prisma & {
  club: { findMany: (args: object) => Promise<ClubRecord[]> };
};

/** Fetch all clubs from the database, ordered by sortOrder then code. */
export async function getClubs(): Promise<ClubRecord[]> {
  return (prisma as PrismaWithClub).club.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, sortOrder: true },
  });
}

/** Club codes only (for dropdowns that only need the code). */
export async function getClubCodes(): Promise<string[]> {
  const clubs = await getClubs();
  return clubs.map((c) => c.code);
}
