
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { ROUND_F, ROUND_PRE} from "@/lib/round";

import { categoryDisplayLabelFromDbRow } from "@/lib/category/categories";
import { prisma } from "@/lib/prisma";
import type { RoundInfo } from "@/lib/round";

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

type TeamShape = {
  id: string;
  seed: string | null;
  member1: TeamMember;
  member2: TeamMember | null;
} | null;

const matchInclude = {
  category: {
    select: { id: true, label: true, labelKo: true, isDoubles: true },
  },
  round: {
    select: { id: true, code: true, labelEn: true, labelKo: true, sortOrder: true },
  },
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

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function getPreferredNameEn(member: TeamMember): string {
  return member.fullNameEn.trim() || member.fullNameKo?.trim() || "";
}

function getPreferredNameKo(member: TeamMember): string {
  return member.fullNameKo?.trim() || member.fullNameEn.trim() || "";
}

function formatTeamSeed(team: TeamShape): string | null {
  return team?.seed?.trim() || null;
}

function formatTeamName(team: TeamShape, locale: "en" | "ko"): string | null {
  if (!team) return null;

  const first =
    locale === "ko" ? getPreferredNameKo(team.member1) : getPreferredNameEn(team.member1);

  const second = team.member2
    ? locale === "ko"
      ? getPreferredNameKo(team.member2)
      : getPreferredNameEn(team.member2)
    : null;

  return second ? `${first} / ${second}` : first;
}

function normalizeMatchDate(dateStr: string | null, tournamentYear: number): string | null {
  const value = dateStr?.trim();
  if (!value) return null;

  if (ISO_DATE_ONLY.test(value)) return value;

  const isoPrefix = value.slice(0, 10);
  if (ISO_DATE_ONLY.test(isoPrefix)) return isoPrefix;

  const parsed = new Date(`${value}, ${tournamentYear}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${tournamentYear}-${month}-${day}`;
}

function computeWinner(match: {
  set1ScoreTeam1: string | null;
  set2ScoreTeam1: string | null;
  set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null;
  set2ScoreTeam2: string | null;
  set3ScoreTeam2: string | null;
}): 1 | 2 | null {
  const sets = [
    [match.set1ScoreTeam1, match.set1ScoreTeam2],
    [match.set2ScoreTeam1, match.set2ScoreTeam2],
    [match.set3ScoreTeam1, match.set3ScoreTeam2],
  ] as const;

  let wins1 = 0;
  let wins2 = 0;
  let completedSets = 0;

  for (const [raw1, raw2] of sets) {
    const score1 = raw1 ? parseInt(raw1, 10) : NaN;
    const score2 = raw2 ? parseInt(raw2, 10) : NaN;

    if (Number.isNaN(score1) || Number.isNaN(score2)) continue;

    completedSets += 1;

    if (score1 > score2) wins1 += 1;
    if (score2 > score1) wins2 += 1;
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
  a: Pick<MatchWithTeamNames, "round" | "matchNumber" | "id">,
  b: Pick<MatchWithTeamNames, "round" | "matchNumber" | "id">
): number {
  const roundDiff = (a.round?.sortOrder ?? -1) - (b.round?.sortOrder ?? -1);
  if (roundDiff !== 0) return roundDiff;

  const matchNumberDiff = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  if (matchNumberDiff !== 0) return matchNumberDiff;

  return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
}

function sortDbMatchesForPublicOrder<
  T extends { round: RoundInfo | null; matchNumber: number | null; id: string },
>(rows: readonly T[]): T[] {
  return [...rows].sort(comparePublicMatchOrder);
}

function mapMatchRow(match: MatchRow): MatchWithTeamNames {
  return {
    id: match.id,
    tournamentYear: match.tournamentYear,
    categoryId: match.categoryId,
    round: match.round ?? null,
    matchNumber: match.matchNumber,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1Seed: formatTeamSeed(match.team1 as TeamShape),
    team2Seed: formatTeamSeed(match.team2 as TeamShape),
    team1DisplayName: formatTeamName(match.team1 as TeamShape, "en"),
    team2DisplayName: formatTeamName(match.team2 as TeamShape, "en"),
    team1DisplayNameKo: formatTeamName(match.team1 as TeamShape, "ko"),
    team2DisplayNameKo: formatTeamName(match.team2 as TeamShape, "ko"),
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
    categoryDisplayLabel: categoryDisplayLabelFromDbRow(match.category, "en") ?? null,
    categoryDisplayLabelKo: categoryDisplayLabelFromDbRow(match.category, "ko") ?? null,
  };
}

function mapMatchRows(matches: readonly MatchRow[]): MatchWithTeamNames[] {
  return matches.map(mapMatchRow);
}

async function fetchRawMatches(args: {
  where: Prisma.MatchWhereInput;
  orderBy?: Prisma.MatchOrderByWithRelationInput[];
}): Promise<MatchRow[]> {
  return prisma.match.findMany({
    where: args.where,
    include: matchInclude,
    orderBy: args.orderBy,
  });
}

async function fetchMappedMatches(args: {
  where: Prisma.MatchWhereInput;
  orderBy?: Prisma.MatchOrderByWithRelationInput[];
  needsPublicSort?: boolean;
}): Promise<MatchWithTeamNames[]> {
  const raw = await fetchRawMatches(args);
  const sorted = args.needsPublicSort ? sortDbMatchesForPublicOrder(raw) : raw;
  return mapMatchRows(sorted);
}

function groupMappedMatchesByCategory(
  matches: readonly MatchWithTeamNames[],
  categoryIds?: readonly string[]
): Record<string, MatchWithTeamNames[]> {
  const out: Record<string, MatchWithTeamNames[]> = {};

  for (const categoryId of categoryIds ?? []) {
    out[categoryId] = [];
  }

  for (const match of matches) {
    (out[match.categoryId] ??= []).push(match);
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
    for (const categoryId of categoryIds) {
      out[year][categoryId] = [];
    }
  }

  for (const match of matches) {
    out[match.tournamentYear] ??= {};
    out[match.tournamentYear][match.categoryId] ??= [];
    out[match.tournamentYear][match.categoryId].push(match);
  }

  return out;
}

function resolveChampionshipMatch(
  matches: readonly MatchWithTeamNames[]
): MatchWithTeamNames | undefined {
  const finalRound = matches.find((match) => match.round?.code === ROUND_F);
  if (finalRound) return finalRound;

  const championshipRows = matches.filter((match) =>
    /championship/i.test(match.comment ?? "")
  );

  if (championshipRows.length === 0) return undefined;

  return championshipRows.sort((a, b) => (b.matchNumber ?? -1) - (a.matchNumber ?? -1))[0];
}

export async function getHonourRollByCategoryIds(
  categoryIds: string[]
): Promise<Record<string, HonourRollEntry[]>> {
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const out: Record<string, HonourRollEntry[]> = {};

  for (const categoryId of uniqueCategoryIds) {
    out[categoryId] = [];
  }

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
      const existing = byYear.get(match.tournamentYear);
      if (existing) existing.push(match);
      else byYear.set(match.tournamentYear, [match]);
    }

    const years = [...byYear.keys()].sort((a, b) => b - a);

    out[categoryId] = years.flatMap((year) => {
      const championship = resolveChampionshipMatch(byYear.get(year) ?? []);
      if (!championship || championship.winner == null) return [];
      return [{ year, match: championship }];
    });
  }

  return out;
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

    const existing = datesByYearMap.get(row.tournamentYear);
    if (existing) existing.add(iso);
    else datesByYearMap.set(row.tournamentYear, new Set([iso]));
  }

  const yearsWithMatches = [...yearSet].sort((a, b) => b - a);
  const datesByYear: Record<number, string[]> = {};

  for (const [year, dates] of datesByYearMap) {
    datesByYear[year] = [...dates].sort();
  }

  return { yearsWithMatches, datesByYear };
}

const getAllMatchesForScheduleCached = unstable_cache(
  async (tournamentYear: number): Promise<MatchWithTeamNames[]> =>
    fetchMappedMatches({
      where: { tournamentYear },
      orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
      needsPublicSort: false,
    }),
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
    for (const categoryId of uniqueCategoryIds) {
      out[year][categoryId] = [];
    }
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

// ─── Match status chips ───────────────────────────────────────────────────────

const MATCH_STATUS_CHIPS = {
  scheduled: {
    label: { en: "Scheduled", ko: "예정" },
    chipClass: "bg-[var(--match-status-scheduled-bg)] text-[var(--match-status-scheduled-text)]",
  },
  completed: {
    label: { en: "Completed", ko: "종료" },
    chipClass: "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
  },
  cancelled: {
    label: { en: "Cancelled", ko: "취소" },
    chipClass: "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
  },
  pending: {
    label: { en: "Pending", ko: "대기" },
    chipClass: "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
  },
} as const;

function matchStatusVariant(status: string): keyof typeof MATCH_STATUS_CHIPS {
  const s = status.trim().toLowerCase();
  if (s === "scheduled") return "scheduled";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "pending";
}

export function matchStatusLabel(status: string, locale: "en" | "ko"): string {
  return MATCH_STATUS_CHIPS[matchStatusVariant(status)].label[locale];
}

export function matchStatusChipClass(status: string): string {
  return MATCH_STATUS_CHIPS[matchStatusVariant(status)].chipClass;
}

// ─── Match ID helpers ─────────────────────────────────────────────────────────

export function matchIdUsesPrelimsSeedLetter(code: string | null | undefined): boolean {
  return (code ?? "").trim() === ROUND_PRE;
}

export function matchIdYearSuffix(tournamentYear: number): string {
  const yy = ((Math.trunc(tournamentYear) % 100) + 100) % 100;
  return String(yy).padStart(2, "0");
}

export function buildMatchId(
  tournamentYear: number,
  categoryId: string,
  roundCode: string | null | undefined,
  matchNumber: number,
  options?: { prelimsSeedLetter?: string | null }
): string {
  const cat = categoryId.trim();
  if (!cat) throw new Error("categoryId is required");
  const n = Math.trunc(matchNumber);
  if (!Number.isFinite(n) || n < 1) throw new Error("matchNumber must be a positive integer");

  const code = (roundCode ?? "").trim().toUpperCase();
  const seedLetter = (options?.prelimsSeedLetter ?? "").trim().toUpperCase();
  const roundSegment = code === ROUND_PRE ? `PRE${seedLetter}` : code;

  return `${matchIdYearSuffix(tournamentYear)}${cat}${roundSegment}${n}`;
}

function teamSlotNumberFromId(teamId: string | null | undefined): number | null {
  if (!teamId) return null;
  const m = teamId.match(/(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isNaN(n) ? null : n;
}

export function resolveBracketTeamDisplayRank(teamId: string | null | undefined, rankMap: Map<string, number>): number | null {
  if (!teamId) return null;
  const fromStandings = rankMap.get(teamId);
  if (fromStandings != null) return fromStandings;
  return teamSlotNumberFromId(teamId);
}


export const getAvailableYears = unstable_cache(
  async () => {
    const [regRows, teamRows, matchRows] = await Promise.all([
      prisma.tournamentRegistration.findMany({ select: { tournamentYear: true }, distinct: ["tournamentYear"] }),
      prisma.team.findMany({ select: { tournamentYear: true }, distinct: ["tournamentYear"] }),
      prisma.match.findMany({ select: { tournamentYear: true }, distinct: ["tournamentYear"] }),
    ]);

    const allYears = [...new Set([...regRows, ...teamRows, ...matchRows].map((r) => r.tournamentYear))]
      .filter((year): year is number => typeof year === "number")
      .sort((a, b) => b - a);

    const yearsWithMatches = [...new Set(matchRows.map((r) => r.tournamentYear))]
      .filter((year): year is number => typeof year === "number")
      .sort((a, b) => b - a);

    return { allYears, yearsWithMatches };
  },
  ["available-years"],
  { revalidate: 300 }
);

