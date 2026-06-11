import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { orderTeamMembersForDisplay } from "@/lib/utils";

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
        member1: { select: { fullNameEn: true, fullNameKo: true, gender: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true, gender: true } },
      },
    });
    return rows.map((t) => {
      const [m1, m2] = orderTeamMembersForDisplay(t.member1, t.member2);
      return {
        id: t.id,
        tournamentYear: t.tournamentYear,
        categoryId: t.categoryId,
        seed: t.seed?.trim() || null,
        member1NameEn: m1.fullNameEn.trim() || m1.fullNameKo?.trim() || "",
        member1NameKo: m1.fullNameKo?.trim() || null,
        member2NameEn: m2?.fullNameEn.trim() || m2?.fullNameKo?.trim() || null,
        member2NameKo: m2?.fullNameKo?.trim() || null,
      };
    });
  },
  ["all-teams"],
  { revalidate: 60 },
);
