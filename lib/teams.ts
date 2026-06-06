import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type TeamRecord = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  seed: string | null;
  member1NameEn: string;
  member1NameKo: string | null;
  member2NameEn: string | null;
  member2NameKo: string | null;
};

export const getAllTeams = unstable_cache(
  async (): Promise<TeamRecord[]> => {
    const rows = await prisma.team.findMany({
      select: {
        id: true,
        tournamentYear: true,
        categoryId: true,
        seed: true,
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      tournamentYear: t.tournamentYear,
      categoryId: t.categoryId,
      seed: t.seed?.trim() || null,
      member1NameEn: t.member1.fullNameEn.trim() || t.member1.fullNameKo?.trim() || "",
      member1NameKo: t.member1.fullNameKo?.trim() || null,
      member2NameEn: t.member2?.fullNameEn.trim() || t.member2?.fullNameKo?.trim() || null,
      member2NameKo: t.member2?.fullNameKo?.trim() || null,
    }));
  },
  ["all-teams"],
  { revalidate: 60 },
);
