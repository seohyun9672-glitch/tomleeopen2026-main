import { prisma } from "@/lib/prisma";

import { getCategories } from "./db";
import { getCategoryYearStatusDelegate } from "./yearStatusDelegate";
import {
  defaultCategoryYearStatus,
  parseCategoryYearStatus,
  type CategoryParticipation,
  type CategoryYearListItem,
} from "./yearStatus";

function normalizedCategoryYearStatus(stored: string | undefined, tournamentYear: number) {
  return parseCategoryYearStatus(stored?.trim() ?? "") ?? defaultCategoryYearStatus(tournamentYear);
}

/** Distinct years that have `CategoryYearStatus` rows (for admin year filter). */
export async function getDistinctTournamentCategoryYearsForFilter(): Promise<number[]> {
  const cy = getCategoryYearStatusDelegate();
  const rows = (await cy.findMany({
    distinct: ["tournamentYear"],
    select: { tournamentYear: true },
    orderBy: { tournamentYear: "desc" },
  })) as { tournamentYear: number }[];
  return rows.map((r) => r.tournamentYear);
}

/** All categories for a year with effective status (DB row or default). */
export async function getCategoryYearStatusList(tournamentYear: number): Promise<CategoryYearListItem[]> {
  const cy = getCategoryYearStatusDelegate();
  const [cats, rows] = await Promise.all([
    getCategories(),
    cy.findMany({
      where: { tournamentYear },
      select: { categoryId: true, status: true },
    }) as Promise<{ categoryId: string; status: string }[]>,
  ]);
  const byId = new Map(rows.map((r) => [r.categoryId, r.status]));
  return cats.map((c) => ({
    categoryId: c.id,
    status: normalizedCategoryYearStatus(byId.get(c.id), tournamentYear),
  }));
}

/** Team count and distinct participating players (registrant + linked partner) per category for a year. */
export async function getCategoryParticipationForYear(
  tournamentYear: number,
  categoryIds: readonly string[]
): Promise<Record<string, CategoryParticipation>> {
  const [teamGroups, regs] = await Promise.all([
    prisma.team.groupBy({
      by: ["categoryId"],
      where: { tournamentYear },
      _count: { _all: true },
    }),
    prisma.tournamentRegistration.findMany({
      where: { tournamentYear },
      select: { categoryId: true, playerId: true, partnerId: true },
    }),
  ]);
  const teamCount = new Map<string, number>();
  for (const g of teamGroups) {
    teamCount.set(g.categoryId, g._count._all);
  }
  const playerSets = new Map<string, Set<number>>();
  for (const r of regs) {
    let s = playerSets.get(r.categoryId);
    if (!s) {
      s = new Set();
      playerSets.set(r.categoryId, s);
    }
    s.add(r.playerId);
    if (r.partnerId != null) s.add(r.partnerId);
  }
  const out: Record<string, CategoryParticipation> = {};
  for (const id of categoryIds) {
    out[id] = {
      teams: teamCount.get(id) ?? 0,
      players: playerSets.get(id)?.size ?? 0,
    };
  }
  return out;
}
