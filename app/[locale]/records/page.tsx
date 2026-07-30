import { prisma } from "@/lib/prisma";
import { RecordsHub } from "@/app/records/RecordsHub";
import { PageContainer } from "@/app/components/PageContainer";
import { getAllMatches } from "@/lib/matches";
import type { Match } from "@/lib/matches";
import { getAllTeams } from "@/lib/teams";
import { getCategories, buildCategoryByIdMap } from "@/lib/categories";
import type { CategoryOption } from "@/lib/categories";
import {
  buildTeamMemberMap,
  computePlayerRecords,
  computePlayerTitles,
  buildPlayerMatchHistory,
  buildPlayerCategoryIds,
} from "@/lib/records";
import type { PlayerTitle } from "@/lib/records";
import type { PlayerRecordRow } from "@/app/records/RecordsHub";

export default async function RecordsPage() {
  const [categories, teams, matches, players] = await Promise.all([
    getCategories(),
    getAllTeams(),
    getAllMatches(),
    prisma.player.findMany({
      select: {
        id: true,
        fullNameEn: true,
        fullNameKo: true,
        clubs: { select: { clubCode: true, club: { select: { name: true, nameKo: true } } } },
      },
      orderBy: { fullNameEn: "asc" },
    }),
  ]);

  const categoriesById = buildCategoryByIdMap(categories);
  const teamMembers = buildTeamMemberMap(teams);
  const recordsByPlayer = computePlayerRecords(matches, teamMembers);
  const titlesByPlayer = computePlayerTitles(matches, teamMembers, categoriesById);
  const historyByPlayer = buildPlayerMatchHistory(matches, teamMembers);
  const categoryIdsByPlayer = buildPlayerCategoryIds(matches, teamMembers);

  const rows: PlayerRecordRow[] = players
    .map((p) => {
      const stats = recordsByPlayer.get(p.id) ?? { wins: 0, losses: 0 };
      const matchesCount = stats.wins + stats.losses;
      const categoryIds = [...(categoryIdsByPlayer.get(p.id) ?? [])];
      const playerCategories: CategoryOption[] = categoryIds
        .map((id) => categoriesById.get(id))
        .filter((c): c is NonNullable<typeof c> => c != null)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .map((c) => ({ id: c.id, label: c.label, labelKo: c.labelKo }));
      return {
        playerId: p.id,
        fullNameEn: p.fullNameEn,
        fullNameKo: p.fullNameKo,
        clubs: p.clubs.map((c) => ({
          code: c.clubCode,
          name: c.club.name?.trim() || c.clubCode,
          nameKo: c.club.nameKo?.trim() || null,
        })),
        wins: stats.wins,
        losses: stats.losses,
        winRate: matchesCount > 0 ? Math.round((stats.wins / matchesCount) * 100) : 0,
        matchesCount,
        categories: playerCategories,
        titlesCount: titlesByPlayer.get(p.id)?.length ?? 0,
      };
    })
    .filter((r) => r.matchesCount > 0);

  const titlesByPlayerId: Record<number, PlayerTitle[]> = {};
  for (const [id, titles] of titlesByPlayer) titlesByPlayerId[id] = titles;

  const historyByPlayerId: Record<number, Record<number, Match[]>> = {};
  for (const [id, byYear] of historyByPlayer) {
    const obj: Record<number, Match[]> = {};
    for (const [year, ms] of byYear) obj[year] = ms;
    historyByPlayerId[id] = obj;
  }

  return (
    <PageContainer>
      <RecordsHub rows={rows} titlesByPlayerId={titlesByPlayerId} historyByPlayerId={historyByPlayerId} />
    </PageContainer>
  );
}
