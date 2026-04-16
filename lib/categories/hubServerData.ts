import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMatchesByCategories } from "@/lib/matches";
import type { MatchWithTeamNames } from "@/lib/matches";
import type { CategoryRecord } from "./types";

export type TeamEntry = { id: string; seed: string; player1Name: string; player2Name?: string };
export type TeamsByCategory = Record<string, TeamEntry[]>;

/** Order pools: A1–A3, B1–B3, then numeric seeds (e.g. 1–4). */
function seedOrder(seed?: string | null): number {
  const value = seed?.trim() || "—";

  if (value === "—") return 9999;

  const poolMatch = /^([A-Za-z])(\d+)$/.exec(value);
  if (poolMatch) {
    const letterOrder = poolMatch[1]!.toUpperCase().charCodeAt(0) - 64;
    const numberOrder = Number.parseInt(poolMatch[2]!, 10);
    return letterOrder * 100 + numberOrder;
  }

  if (/^\d+$/.test(value)) {
    return 1000 + Number.parseInt(value, 10);
  }

  const letterIndex = "ABCD".indexOf(value.toUpperCase());
  return letterIndex >= 0 ? letterIndex : 9998;
}

/** Raw team DB fetch per year — cached 60 s so locale changes reuse data without a DB round-trip. */
const getRawTeamsForYear = unstable_cache(
  async (year: number) =>
    prisma.team.findMany({
      where: { tournamentYear: year },
      select: {
        id: true,
        categoryId: true,
        seed: true,
        member1PlayerId: true,
        member2PlayerId: true,
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
      orderBy: [{ categoryId: "asc" }, { id: "asc" }],
    }),
  ["raw-teams-year"],
  { revalidate: 60 }
);

function getLocalizedName(player: { fullNameEn: string; fullNameKo: string | null } | null): string {
  if (!player) return "";
  return player.fullNameEn?.trim() || player.fullNameKo?.trim() || "";
}

function getPairKey(team: {
  member1PlayerId: number;
  member2PlayerId: number | null;
}): string {
  if (team.member2PlayerId == null) {
    return `${team.member1PlayerId},s`;
  }

  const first = Math.min(team.member1PlayerId, team.member2PlayerId);
  const second = Math.max(team.member1PlayerId, team.member2PlayerId);
  return `${first},${second}`;
}

export async function buildTeamsByCategoryForYear(
  year: number,
  categories: CategoryRecord[]
): Promise<{ teamsByCategory: TeamsByCategory; teamCountByCategory: Record<string, number> }> {
  const teams = await getRawTeamsForYear(year);

  const teamsByCategory: TeamsByCategory = Object.fromEntries(
    categories.map((category) => [category.id, []])
  ) as TeamsByCategory;

  const teamCountByCategory: Record<string, number> = Object.fromEntries(
    categories.map((category) => [category.id, 0])
  );

  const seenInCategory = new Map<string, Set<string>>();

  for (const team of teams) {
    const pairKey = getPairKey(team);

    let seenPairs = seenInCategory.get(team.categoryId);
    if (!seenPairs) {
      seenPairs = new Set<string>();
      seenInCategory.set(team.categoryId, seenPairs);
    }

    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const list = teamsByCategory[team.categoryId];
    if (!list) continue;

    const seed = team.seed ?? "—";

    list.push({
      id: String(team.id),
      seed,
      player1Name: getLocalizedName(team.member1),
      player2Name: getLocalizedName(team.member2) || undefined,
    });
  }

  for (const categoryId of Object.keys(teamsByCategory)) {
    const list = teamsByCategory[categoryId];
    list.sort((a, b) => {
      const seedDiff = seedOrder(a.seed) - seedOrder(b.seed);
      return seedDiff || a.id.localeCompare(b.id);
    });
    teamCountByCategory[categoryId] = list.length;
  }

  return { teamsByCategory, teamCountByCategory };
}

export async function buildMatchesByCategoryForYear(
  year: number,
  categoryIds: string[]
): Promise<Record<string, MatchWithTeamNames[]>> {
  return getMatchesByCategories(year, categoryIds);
}

/** Only categories with at least one team or match for `tournamentYear` — never fall back to the full catalog. */
export function filterCategoriesWithHubData(
  categories: CategoryRecord[],
  teamCountByCategory: Record<string, number>,
  matchesByCategory: Record<string, MatchWithTeamNames[]>
): CategoryRecord[] {
  return categories.filter((category) => {
    return (
      (teamCountByCategory[category.id] ?? 0) > 0 ||
      (matchesByCategory[category.id]?.length ?? 0) > 0
    );
  });
}