import { prisma } from "@/lib/prisma";
import { PlayersHub } from "@/app/players/PlayersHub";
import { PageContainer } from "@/app/components/PageContainer";
import { orderTeamMembersForDisplay } from "@/lib/utils";
import { getCategories } from "@/lib/categories";

export default async function PlayersPage() {
  const [categories, rows, teamRows] = await Promise.all([
    getCategories(),
    prisma.player.findMany({
      select: {
        id: true,
        fullNameEn: true,
        fullNameKo: true,
        clubs: { select: { clubCode: true, club: { select: { name: true, nameKo: true } } } },
        registrations: {
          where: { status: "Confirmed" },
          select: {
            tournamentYear: true,
            categoryId: true,
            category: { select: { label: true, labelKo: true } },
          },
        },
      },
      orderBy: { fullNameEn: "asc" },
    }),
    prisma.team.findMany({
      include: {
        category: { select: { label: true, labelKo: true, isDoubles: true, sortOrder: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true, gender: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true, gender: true } },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    }),
  ]);

  const players = rows
    .map((p) => ({
      id: p.id,
      fullNameEn: p.fullNameEn,
      fullNameKo: p.fullNameKo,
      clubs: p.clubs
        .map((c) => ({
          code: c.clubCode,
          name: c.club.name?.trim() || c.clubCode,
          nameKo: c.club.nameKo?.trim() || null,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      registrations: p.registrations.map((r) => ({
        year: r.tournamentYear,
        categoryId: r.categoryId,
        label: r.category.label,
        labelKo: r.category.labelKo,
      })),
    }))
    .sort((a, b) => {
      const en = a.fullNameEn.localeCompare(b.fullNameEn, "en");
      if (en !== 0) return en;
      return (a.fullNameKo ?? "").localeCompare(b.fullNameKo ?? "", "en");
    });

  const teams = teamRows.map((t) => {
    const [m1, m2] = orderTeamMembersForDisplay(t.member1, t.member2);
    return {
      teamId: t.id,
      tournamentYear: t.tournamentYear,
      categoryId: t.categoryId,
      categoryLabel: t.category.label,
      categoryLabelKo: t.category.labelKo,
      isDoubles: t.category.isDoubles,
      seed: t.seed ?? null,
      member1NameEn: m1.fullNameEn.trim() || m1.fullNameKo?.trim() || "",
      member1NameKo: m1.fullNameKo?.trim() || null,
      member2NameEn: m2?.fullNameEn.trim() || m2?.fullNameKo?.trim() || null,
      member2NameKo: m2?.fullNameKo?.trim() || null,
    };
  });

  return (
    <PageContainer>
      <PlayersHub rows={players} teams={teams} categories={categories} />
    </PageContainer>
  );
}
