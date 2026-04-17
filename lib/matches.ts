/**
 * Match queries — single source of truth for scores, teams, and outcomes: the `Match` table
 * (via Prisma). All public surfaces should use these loaders so partner fallbacks
 * and winner/score logic stay aligned across Categories, Schedule, Honour roll, and match detail.
 */
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { categoryDisplayLabelFromDbRow } from "@/lib/categories/labels";
import { ROUND_F } from "@/lib/round";
import type { RoundInfo } from "@/lib/round";
import { prisma } from "@/lib/prisma";

export type { RoundInfo };

export type MatchWithTeamNames = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  round: RoundInfo | null;
  matchNumber: number | null;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: string | null;
  team2Seed: string | null;
  team1DisplayName: string | null;
  team2DisplayName: string | null;
  team1DisplayNameKo: string | null;
  team2DisplayNameKo: string | null;
  matchStatus: string;
  date: string | null;
  time: string | null;
  location: string | null;
  set1ScoreTeam1: string | null;
  set2ScoreTeam1: string | null;
  set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null;
  set2ScoreTeam2: string | null;
  set3ScoreTeam2: string | null;
  winner: 1 | 2 | null;
  comment: string | null;
  categoryDisplayLabel: string | null;
  categoryDisplayLabelKo: string | null;
};

export type HonourRollEntry = {
  year: number;
  match: MatchWithTeamNames;
};

export type ScheduleCalendarIndex = {
  yearsWithMatches: number[];
  datesByYear: Record<number, string[]>;
};

type TeamMember = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
};

type TeamForDisplay = {
  member1: TeamMember;
  member2: TeamMember | null;
} | null;

const matchInclude = {
  category: { select: { id: true, label: true, labelKo: true, isDoubles: true } },
  round: { select: { id: true, code: true, labelEn: true, labelKo: true, sortOrder: true } },
  team1: {
    select: {
      id: true,
      seed: true,
      member1: { select: { id: true, fullNameEn: true, fullNameKo: true } },
      member2: { select: { id: true, fullNameEn: true, fullNameKo: true } },
    },
  },
  team2: {
    select: {
      id: true,
      seed: true,
      member1: { select: { id: true, fullNameEn: true, fullNameKo: true } },
      member2: { select: { id: true, fullNameEn: true, fullNameKo: true } },
    },
  },
} as const;

type MatchRow = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

type TeamWithOptionalMeta = {
  id?: string | null;
  seed?: string | null;
  member1?: { id?: number } | null;
} | null;

type RegistrationPartnerRow = {
  tournamentYear: number;
  categoryId: string;
  playerId: number;
  partner: { fullNameEn: string | null; fullNameKo: string | null } | null;
};

type PartnerMaps = {
  en: Map<string, string>;
  ko: Map<string, string>;
};

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function oneName(member: TeamMember): string {
  return member.fullNameEn?.trim() || member.fullNameKo?.trim() || "";
}

function oneNameKo(member: TeamMember): string {
  return member.fullNameKo?.trim() || member.fullNameEn?.trim() || "";
}

function getMember1Id(team: unknown): number | null {
  return ((team as TeamWithOptionalMeta)?.member1?.id ?? null) as number | null;
}

function teamSeedForDisplay(team: unknown): string | null {
  if (team == null || typeof team !== "object") return null;
  const t = team as { seed?: string | null };
  return t.seed?.trim() || null;
}

function teamDisplayName(
  team: TeamForDisplay,
  fallbackPartnerName?: string | null,
  fallbackWhenMissing?: string | null
): string | null {
  if (!team) return null;
  const n1 = oneName(team.member1);
  const n2 = team.member2
    ? oneName(team.member2)
    : (fallbackPartnerName?.trim() || fallbackWhenMissing || null);
  return n2 ? `${n1} / ${n2}` : n1;
}

function teamDisplayNameKo(
  team: TeamForDisplay,
  fallbackPartnerKo?: string | null,
  fallbackWhenMissing?: string | null
): string | null {
  if (!team) return null;
  const n1 = oneNameKo(team.member1);
  const n2 = team.member2
    ? oneNameKo(team.member2)
    : (fallbackPartnerKo?.trim() || fallbackWhenMissing || null);
  return n2 ? `${n1} / ${n2}` : n1;
}

function normalizeMatchDate(dateStr: string | null, tournamentYear: number): string | null {
  const value = dateStr?.trim();
  if (!value) return null;
  if (ISO_DATE_ONLY.test(value)) return value;
  const isoPrefix = value.slice(0, 10);
  if (ISO_DATE_ONLY.test(isoPrefix)) return isoPrefix;
  try {
    const parsed = new Date(`${value}, ${tournamentYear}`);
    if (Number.isNaN(parsed.getTime())) return null;
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${tournamentYear}-${month}-${day}`;
  } catch {
    return null;
  }
}

function getDateSearchVariants(dateISO: string): string[] {
  const variants = new Set<string>([dateISO]);
  try {
    const date = new Date(`${dateISO}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      variants.add(
        date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    }
  } catch {
    // ignore
  }
  return [...variants];
}

function isSameMatchDate(
  rawDate: string | null,
  tournamentYear: number,
  dateISO: string
): boolean {
  return normalizeMatchDate(rawDate, tournamentYear) === dateISO;
}

function computeWinner(m: {
  set1ScoreTeam1: string | null;
  set2ScoreTeam1: string | null;
  set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null;
  set2ScoreTeam2: string | null;
  set3ScoreTeam2: string | null;
}): 1 | 2 | null {
  const sets = [
    [m.set1ScoreTeam1, m.set1ScoreTeam2],
    [m.set2ScoreTeam1, m.set2ScoreTeam2],
    [m.set3ScoreTeam1, m.set3ScoreTeam2],
  ] as const;

  let wins1 = 0;
  let wins2 = 0;
  let completedSets = 0;

  for (const [a, b] of sets) {
    const n1 = a ? parseInt(a, 10) : NaN;
    const n2 = b ? parseInt(b, 10) : NaN;
    if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
    completedSets++;
    if (n1 > n2) wins1++;
    else if (n2 > n1) wins2++;
  }

  if (wins1 >= 2) return 1;
  if (wins2 >= 2) return 2;
  if (completedSets === 1) {
    if (wins1 === 1) return 1;
    if (wins2 === 1) return 2;
  }
  return null;
}

function comparePublicMatchOrder(
  a: { round: RoundInfo | null; matchNumber: number | null; id: string },
  b: { round: RoundInfo | null; matchNumber: number | null; id: string }
): number {
  const rankDiff = (a.round?.sortOrder ?? -1) - (b.round?.sortOrder ?? -1);
  if (rankDiff !== 0) return rankDiff;
  const matchNumberDiff = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  if (matchNumberDiff !== 0) return matchNumberDiff;
  return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
}

function sortDbMatchesForPublicOrder<
  T extends { round: RoundInfo | null; matchNumber: number | null; id: string },
>(rows: readonly T[]): T[] {
  return [...rows].sort(comparePublicMatchOrder);
}

function member1PlayerIdsFromMatchSides(match: { team1: unknown; team2: unknown }): number[] {
  const ids: number[] = [];
  const t1 = getMember1Id(match.team1);
  const t2 = getMember1Id(match.team2);
  if (t1 != null) ids.push(t1);
  if (t2 != null) ids.push(t2);
  return ids;
}

function groupMatchesByCategoryYear<T extends { tournamentYear: number; categoryId: string }>(
  matches: readonly T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const match of matches) {
    const key = `${match.tournamentYear}:${match.categoryId}`;
    const list = grouped.get(key);
    if (list) list.push(match);
    else grouped.set(key, [match]);
  }
  return grouped;
}

function buildPartnerMapsFromRegistrations(
  regs: readonly RegistrationPartnerRow[]
): PartnerMaps {
  const en = new Map<string, string>();
  const ko = new Map<string, string>();
  for (const reg of regs) {
    const mapKey = `${reg.tournamentYear}:${reg.categoryId}:${reg.playerId}`;
    const enName = reg.partner?.fullNameEn?.trim() || reg.partner?.fullNameKo?.trim() || "";
    const koName = reg.partner?.fullNameKo?.trim() || reg.partner?.fullNameEn?.trim() || "";
    if (enName) en.set(mapKey, enName);
    if (koName) ko.set(mapKey, koName);
  }
  return { en, ko };
}

async function fetchPartnerMapsByWhere(
  where: Prisma.TournamentRegistrationWhereInput
): Promise<PartnerMaps> {
  const regs = await prisma.tournamentRegistration.findMany({
    where,
    select: {
      tournamentYear: true,
      categoryId: true,
      playerId: true,
      partner: { select: { fullNameEn: true, fullNameKo: true } },
    },
  });
  return buildPartnerMapsFromRegistrations(regs);
}

async function fetchPartnerMapsForMatches(matches: readonly MatchRow[]): Promise<PartnerMaps> {
  const grouped = groupMatchesByCategoryYear(matches);
  const neededPartnerKeys = new Set<string>();
  const yearsForPartners = new Set<number>();
  const doublesCategoryIds = new Set<string>();
  const allMember1Ids = new Set<number>();

  for (const [key, list] of grouped) {
    const [yearPart] = key.split(":");
    const year = Number(yearPart);
    if (!list[0]?.category.isDoubles) continue;
    const categoryId = list[0].categoryId;
    yearsForPartners.add(year);
    doublesCategoryIds.add(categoryId);
    const uniquePlayerIds = new Set(list.flatMap(member1PlayerIdsFromMatchSides));
    for (const playerId of uniquePlayerIds) {
      allMember1Ids.add(playerId);
      neededPartnerKeys.add(`${year}:${categoryId}:${playerId}`);
    }
  }

  if (yearsForPartners.size === 0 || doublesCategoryIds.size === 0 || allMember1Ids.size === 0) {
    return { en: new Map(), ko: new Map() };
  }

  const regs = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentYear: { in: [...yearsForPartners] },
      categoryId: { in: [...doublesCategoryIds] },
      playerId: { in: [...allMember1Ids] },
    },
    select: {
      tournamentYear: true,
      categoryId: true,
      playerId: true,
      partner: { select: { fullNameEn: true, fullNameKo: true } },
    },
  });

  const filtered = regs.filter((reg) =>
    neededPartnerKeys.has(`${reg.tournamentYear}:${reg.categoryId}:${reg.playerId}`)
  );
  return buildPartnerMapsFromRegistrations(filtered);
}

function mapMatchRow(match: MatchRow, partnerMaps: PartnerMaps): MatchWithTeamNames {
  const team1Member1Id = getMember1Id(match.team1);
  const team2Member1Id = getMember1Id(match.team2);

  const key1 = team1Member1Id != null ? `${match.tournamentYear}:${match.categoryId}:${team1Member1Id}` : null;
  const key2 = team2Member1Id != null ? `${match.tournamentYear}:${match.categoryId}:${team2Member1Id}` : null;

  const team1Fallback = key1 != null ? (partnerMaps.en.get(key1) ?? null) : null;
  const team2Fallback = key2 != null ? (partnerMaps.en.get(key2) ?? null) : null;
  const team1FallbackKo = key1 != null ? (partnerMaps.ko.get(key1) ?? null) : null;
  const team2FallbackKo = key2 != null ? (partnerMaps.ko.get(key2) ?? null) : null;

  const missingPartnerLabel = match.category.isDoubles ? "Partner TBD" : null;
  const categoryRow = match.category;

  return {
    id: match.id,
    tournamentYear: match.tournamentYear,
    categoryId: match.categoryId,
    round: match.round ?? null,
    matchNumber: match.matchNumber,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1Seed: teamSeedForDisplay(match.team1),
    team2Seed: teamSeedForDisplay(match.team2),
    team1DisplayName: teamDisplayName(match.team1 as TeamForDisplay, team1Fallback, missingPartnerLabel),
    team2DisplayName: teamDisplayName(match.team2 as TeamForDisplay, team2Fallback, missingPartnerLabel),
    team1DisplayNameKo: teamDisplayNameKo(match.team1 as TeamForDisplay, team1FallbackKo, missingPartnerLabel),
    team2DisplayNameKo: teamDisplayNameKo(match.team2 as TeamForDisplay, team2FallbackKo, missingPartnerLabel),
    matchStatus: match.matchStatus,
    date: normalizeMatchDate(match.date, match.tournamentYear) ?? match.date,
    time: match.time,
    location: match.location,
    set1ScoreTeam1: match.set1ScoreTeam1,
    set2ScoreTeam1: match.set2ScoreTeam1,
    set3ScoreTeam1: match.set3ScoreTeam1,
    set1ScoreTeam2: match.set1ScoreTeam2,
    set2ScoreTeam2: match.set2ScoreTeam2,
    set3ScoreTeam2: match.set3ScoreTeam2,
    winner: computeWinner(match),
    comment: match.comment,
    categoryDisplayLabel: categoryDisplayLabelFromDbRow(categoryRow, "en") ?? null,
    categoryDisplayLabelKo: categoryDisplayLabelFromDbRow(categoryRow, "ko") ?? null,
  };
}

async function mapMatchRows(
  matches: MatchRow[],
  prebuiltPartnerMaps?: PartnerMaps
): Promise<MatchWithTeamNames[]> {
  if (matches.length === 0) return [];
  const partnerMaps = prebuiltPartnerMaps ?? await fetchPartnerMapsForMatches(matches);
  return matches.map((match) => mapMatchRow(match, partnerMaps));
}

async function fetchRawMatches(args: {
  where: Prisma.MatchWhereInput;
  orderBy?: Prisma.MatchOrderByWithRelationInput[];
}): Promise<MatchRow[]> {
  const { where, orderBy } = args;
  return prisma.match.findMany({ where, include: matchInclude, orderBy });
}

async function fetchMappedMatches(args: {
  where: Prisma.MatchWhereInput;
  orderBy?: Prisma.MatchOrderByWithRelationInput[];
  needsPublicSort?: boolean;
  prebuiltPartnerMaps?: PartnerMaps;
}): Promise<MatchWithTeamNames[]> {
  const raw = await fetchRawMatches({ where: args.where, orderBy: args.orderBy });
  const sorted = args.needsPublicSort ? sortDbMatchesForPublicOrder(raw) : raw;
  return mapMatchRows(sorted, args.prebuiltPartnerMaps);
}

function groupMappedMatchesByCategory(
  matches: readonly MatchWithTeamNames[],
  categoryIds?: readonly string[]
): Record<string, MatchWithTeamNames[]> {
  const out: Record<string, MatchWithTeamNames[]> = {};
  if (categoryIds) {
    for (const id of categoryIds) out[id] = [];
  }
  for (const match of matches) {
    if (!out[match.categoryId]) out[match.categoryId] = [];
    out[match.categoryId]!.push(match);
  }
  return out;
}

function groupMappedMatchesByYearAndCategory(
  matches: readonly MatchWithTeamNames[],
  years: readonly number[],
  categoryIds: readonly string[]
): Record<number, Record<string, MatchWithTeamNames[]>> {
  const out: Record<number, Record<string, MatchWithTeamNames[]>> = {};
  for (const year of years) {
    out[year] = {};
    for (const categoryId of categoryIds) out[year]![categoryId] = [];
  }
  for (const match of matches) {
    if (!out[match.tournamentYear]) out[match.tournamentYear] = {};
    if (!out[match.tournamentYear]![match.categoryId]) {
      out[match.tournamentYear]![match.categoryId] = [];
    }
    out[match.tournamentYear]![match.categoryId]!.push(match);
  }
  return out;
}

function resolveChampionshipMatch(matches: MatchWithTeamNames[]): MatchWithTeamNames | undefined {
  const finalRound = matches.find((m) => m.round?.code === ROUND_F);
  if (finalRound) return finalRound;

  const championshipRows = matches.filter((m) => /championship/i.test(m.comment ?? ""));
  if (championshipRows.length === 0) return undefined;
  return championshipRows.sort((a, b) => (b.matchNumber ?? -1) - (a.matchNumber ?? -1))[0];
}

export async function getHonourRollByCategoryIds(
  categoryIds: string[]
): Promise<Record<string, HonourRollEntry[]>> {
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const out: Record<string, HonourRollEntry[]> = {};
  for (const id of uniqueCategoryIds) out[id] = [];
  if (uniqueCategoryIds.length === 0) return out;

  const mapped = await fetchMappedMatches({
    where: { categoryId: { in: uniqueCategoryIds } },
    orderBy: [{ categoryId: "asc" }, { tournamentYear: "desc" }, { id: "asc" }],
    needsPublicSort: true,
  });

  const byCategory = groupMappedMatchesByCategory(mapped, uniqueCategoryIds);

  for (const categoryId of uniqueCategoryIds) {
    const list = byCategory[categoryId] ?? [];
    const byYear = new Map<number, MatchWithTeamNames[]>();
    for (const match of list) {
      const yearMatches = byYear.get(match.tournamentYear);
      if (yearMatches) yearMatches.push(match);
      else byYear.set(match.tournamentYear, [match]);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);
    const rows: HonourRollEntry[] = [];
    for (const year of years) {
      const championship = resolveChampionshipMatch(byYear.get(year)!);
      if (!championship || championship.winner == null) continue;
      rows.push({ year, match: championship });
    }
    out[categoryId] = rows;
  }

  return out;
}

const getMatchesForCategoryCached = unstable_cache(
  async (tournamentYear: number, categoryId: string): Promise<MatchWithTeamNames[]> => {
    return fetchMappedMatches({
      where: { tournamentYear, categoryId },
      orderBy: [{ id: "asc" }],
      needsPublicSort: true,
    });
  },
  ["matches-for-category"],
  { revalidate: 60 }
);

export async function getMatchesByCategory(
  tournamentYear: number,
  categoryId: string
): Promise<MatchWithTeamNames[]> {
  return getMatchesForCategoryCached(tournamentYear, categoryId);
}

export async function getMatchesByCategories(
  tournamentYear: number,
  categoryIds: string[]
): Promise<Record<string, MatchWithTeamNames[]>> {
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const out: Record<string, MatchWithTeamNames[]> = {};
  for (const id of uniqueCategoryIds) out[id] = [];
  if (uniqueCategoryIds.length === 0) return out;

  const mapped = await fetchMappedMatches({
    where: { tournamentYear, categoryId: { in: uniqueCategoryIds } },
    orderBy: [{ categoryId: "asc" }, { id: "asc" }],
    needsPublicSort: true,
  });

  return groupMappedMatchesByCategory(mapped, uniqueCategoryIds);
}

export async function getScheduleCalendarIndex(): Promise<ScheduleCalendarIndex> {
  const rows = await prisma.match.findMany({
    where: { date: { not: null } },
    select: { tournamentYear: true, date: true },
    distinct: ["tournamentYear", "date"],
  });

  const yearSet = new Set<number>();
  const datesByYearMap = new Map<number, Set<string>>();

  for (const row of rows) {
    yearSet.add(row.tournamentYear);
    const iso = normalizeMatchDate(row.date, row.tournamentYear);
    if (!iso) continue;
    const set = datesByYearMap.get(row.tournamentYear);
    if (set) set.add(iso);
    else datesByYearMap.set(row.tournamentYear, new Set([iso]));
  }

  const yearsWithMatches = [...yearSet].sort((a, b) => b - a);
  const datesByYear: Record<number, string[]> = {};
  for (const [year, dates] of datesByYearMap) {
    datesByYear[year] = [...dates].sort();
  }
  return { yearsWithMatches, datesByYear };
}

function scheduleDayWhereClause(dateISO: string): Pick<Prisma.MatchWhereInput, "OR"> {
  const variants = getDateSearchVariants(dateISO);
  return {
    OR: [
      ...variants.map((date) => ({ date })),
      { date: { startsWith: dateISO } },
    ],
  };
}

export async function getMatchesForDate(
  tournamentYear: number,
  dateISO: string,
  categoryId?: string | null
): Promise<MatchWithTeamNames[]> {
  const where = categoryId
    ? { tournamentYear, categoryId, ...scheduleDayWhereClause(dateISO) }
    : { tournamentYear, ...scheduleDayWhereClause(dateISO) };

  const registrationWhere: Prisma.TournamentRegistrationWhereInput = categoryId
    ? { tournamentYear, categoryId }
    : {
        tournamentYear,
        category: { isDoubles: true } as Prisma.CategoryWhereInput,
      };

  const [raw, partnerMaps] = await Promise.all([
    fetchRawMatches({ where, orderBy: [{ time: "asc" }, { id: "asc" }] }),
    fetchPartnerMapsByWhere(registrationWhere),
  ]);

  const filtered = raw.filter((match) =>
    isSameMatchDate(match.date, match.tournamentYear, dateISO)
  );
  return mapMatchRows(sortDbMatchesForPublicOrder(filtered), partnerMaps);
}

const getAllMatchesForScheduleCached = unstable_cache(
  async (tournamentYear: number): Promise<MatchWithTeamNames[]> => {
    return fetchMappedMatches({
      where: { tournamentYear },
      orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
      needsPublicSort: false,
    });
  },
  ["all-matches-for-schedule"],
  { revalidate: 60 }
);

export async function getAllMatchesForSchedule(
  tournamentYear: number
): Promise<MatchWithTeamNames[]> {
  return getAllMatchesForScheduleCached(tournamentYear);
}

export async function getMatchesByYearBatch(
  years: number[],
  categoryIds: string[]
): Promise<Record<number, Record<string, MatchWithTeamNames[]>>> {
  const uniqueYears = [...new Set(years)];
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const out: Record<number, Record<string, MatchWithTeamNames[]>> = {};
  for (const year of uniqueYears) {
    out[year] = {};
    for (const categoryId of uniqueCategoryIds) out[year]![categoryId] = [];
  }
  if (uniqueYears.length === 0 || uniqueCategoryIds.length === 0) return out;

  const mapped = await fetchMappedMatches({
    where: {
      tournamentYear: { in: uniqueYears },
      categoryId: { in: uniqueCategoryIds },
    },
    orderBy: [{ tournamentYear: "asc" }, { categoryId: "asc" }, { id: "asc" }],
    needsPublicSort: true,
  });
  return groupMappedMatchesByYearAndCategory(mapped, uniqueYears, uniqueCategoryIds);
}

export async function getMatchWithTeamNamesById(id: string): Promise<MatchWithTeamNames | null> {
  const row = await prisma.match.findUnique({ where: { id }, include: matchInclude });
  if (!row) return null;
  const mapped = await mapMatchRows([row]);
  return mapped[0] ?? null;
}
