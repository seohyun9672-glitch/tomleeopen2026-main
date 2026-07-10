import { unstable_cache } from "next/cache";
import type { Prisma, Round } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getToday, orderTeamMembersForDisplay, parseTimeToHHMM } from "@/lib/utils";

export type Match = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  round: Round | null;
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

export type MatchCalendarIndex = {
  yearsWithMatches: number[];
  datesByYear: Record<number, string[]>;
};

// ─── DB row mapping ───────────────────────────────────────────────────────────

type TeamMember = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  gender?: string | null;
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
  roundRef: {
    select: { id: true, code: true, labelEn: true, labelKo: true, sortOrder: true },
  },
  team1: {
    select: {
      id: true,
      seed: true,
      member1: { select: { id: true, fullNameEn: true, fullNameKo: true, gender: true } },
      member2: { select: { id: true, fullNameEn: true, fullNameKo: true, gender: true } },
    },
  },
  team2: {
    select: {
      id: true,
      seed: true,
      member1: { select: { id: true, fullNameEn: true, fullNameKo: true, gender: true } },
      member2: { select: { id: true, fullNameEn: true, fullNameKo: true, gender: true } },
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
  const [m1, m2] = orderTeamMembersForDisplay(team.member1, team.member2);
  const first = locale === "ko" ? getPreferredNameKo(m1) : getPreferredNameEn(m1);
  const second = m2
    ? locale === "ko" ? getPreferredNameKo(m2) : getPreferredNameEn(m2)
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

export function computeWinner(match: {
  set1ScoreTeam1: string | null; set2ScoreTeam1: string | null; set3ScoreTeam1: string | null;
  set1ScoreTeam2: string | null; set2ScoreTeam2: string | null; set3ScoreTeam2: string | null;
}): 1 | 2 | null {
  const sets = [
    [match.set1ScoreTeam1, match.set1ScoreTeam2],
    [match.set2ScoreTeam1, match.set2ScoreTeam2],
    [match.set3ScoreTeam1, match.set3ScoreTeam2],
  ] as const;

  let wins1 = 0; let wins2 = 0; let completedSets = 0;

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
  a: Pick<Match, "round" | "id">,
  b: Pick<Match, "round" | "id">
): number {
  const roundDiff = (a.round?.sortOrder ?? -1) - (b.round?.sortOrder ?? -1);
  if (roundDiff !== 0) return roundDiff;
  return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
}

/** Single source of truth for match status derivation used by API routes and display mapping. */
export function computeMatchStatus(
  storedStatus: string,
  date: string | null,
  time: string | null,
  location: string | null,
  set1ScoreTeam1: string | null,
  set1ScoreTeam2: string | null,
  set2ScoreTeam1: string | null,
  set2ScoreTeam2: string | null,
): string {
  if (/^cancell?ed$/i.test(storedStatus.trim())) return "Cancelled";
  const hasSchedule = Boolean(date) && Boolean(time) && Boolean(location);
  const hasSet1 = Boolean(set1ScoreTeam1) && Boolean(set1ScoreTeam2);
  const hasSet2 = Boolean(set2ScoreTeam1) && Boolean(set2ScoreTeam2);
  if (hasSchedule && hasSet1 && hasSet2) return "Completed";
  if (hasSchedule) return "Scheduled";
  return "Pending";
}

function mapMatchRow(match: MatchRow): Match {
  const date = normalizeMatchDate(match.date, match.tournamentYear) ?? match.date;
  const time = match.time;
  const location = match.location;
  return {
    id: match.id,
    tournamentYear: match.tournamentYear,
    categoryId: match.categoryId,
    round: match.roundRef ?? null,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1Seed: formatTeamSeed(match.team1 as TeamShape),
    team2Seed: formatTeamSeed(match.team2 as TeamShape),
    team1DisplayName: formatTeamName(match.team1 as TeamShape, "en"),
    team2DisplayName: formatTeamName(match.team2 as TeamShape, "en"),
    team1DisplayNameKo: formatTeamName(match.team1 as TeamShape, "ko"),
    team2DisplayNameKo: formatTeamName(match.team2 as TeamShape, "ko"),
    matchStatus: computeMatchStatus(match.matchStatus, date ?? null, time ?? null, location ?? null, match.set1ScoreTeam1, match.set1ScoreTeam2, match.set2ScoreTeam1, match.set2ScoreTeam2),
    date,
    time,
    location,
    set1ScoreTeam1: match.set1ScoreTeam1,
    set2ScoreTeam1: match.set2ScoreTeam1,
    set3ScoreTeam1: match.set3ScoreTeam1,
    set1ScoreTeam2: match.set1ScoreTeam2,
    set2ScoreTeam2: match.set2ScoreTeam2,
    set3ScoreTeam2: match.set3ScoreTeam2,
    winner: computeWinner(match),
    comment: match.comment,
    categoryDisplayLabel: match.category.label.trim() || null,
    categoryDisplayLabelKo: match.category.labelKo?.trim() || match.category.label.trim() || null,
  };
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

export const getAllMatches = unstable_cache(
  async (): Promise<Match[]> => {
    const rows = await prisma.match.findMany({ include: matchInclude });
    return rows
      .map(mapMatchRow)
      .sort(comparePublicMatchOrder);
  },
  ["all-matches"],
  { revalidate: 10, tags: ["all-matches"] }
);

export function isoDateLocal(d?: Date): string {
  if (!d) return getToday();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Pure data utilities ──────────────────────────────────────────────────────

/** Returns a set of "playerId:year:categoryId" keys for the winning team of each final match. */
export async function getFinalistPlayerKeys(): Promise<Set<string>> {
  const rows = await prisma.match.findMany({
    where: { roundRef: { code: "F" } },
    select: {
      tournamentYear: true,
      categoryId: true,
      set1ScoreTeam1: true, set2ScoreTeam1: true, set3ScoreTeam1: true,
      set1ScoreTeam2: true, set2ScoreTeam2: true, set3ScoreTeam2: true,
      team1: {
        select: {
          member1: { select: { id: true } },
          member2: { select: { id: true } },
        },
      },
      team2: {
        select: {
          member1: { select: { id: true } },
          member2: { select: { id: true } },
        },
      },
    },
  });

  const keys = new Set<string>();
  for (const m of rows) {
    const winner = computeWinner(m);
    const winningTeam = winner === 1 ? m.team1 : winner === 2 ? m.team2 : null;
    if (!winningTeam) continue;
    keys.add(`${winningTeam.member1.id}:${m.tournamentYear}:${m.categoryId}`);
    if (winningTeam.member2) keys.add(`${winningTeam.member2.id}:${m.tournamentYear}:${m.categoryId}`);
  }
  return keys;
}

export function groupMatchesByYearAndCategory(
  matches: Match[]
): Record<number, Record<string, Match[]>> {
  const out: Record<number, Record<string, Match[]>> = {};
  for (const match of matches) {
    out[match.tournamentYear] ??= {};
    out[match.tournamentYear][match.categoryId] ??= [];
    out[match.tournamentYear][match.categoryId].push(match);
  }
  return out;
}

export function getMatchCalendarIndex(matches: Match[]): MatchCalendarIndex {
  const datesByYearMap = new Map<number, Set<string>>();
  for (const m of matches) {
    if (!m.date) continue;
    const existing = datesByYearMap.get(m.tournamentYear);
    if (existing) existing.add(m.date);
    else datesByYearMap.set(m.tournamentYear, new Set([m.date]));
  }
  const yearsWithMatches = [...datesByYearMap.keys()].sort((a, b) => b - a);
  const datesByYear: Record<number, string[]> = {};
  for (const [year, dates] of datesByYearMap) {
    datesByYear[year] = [...dates].sort();
  }
  return { yearsWithMatches, datesByYear };
}

// ─── Match status ─────────────────────────────────────────────────────────────

export const MATCH_STATUS_LABELS: Record<string, { en: string; ko: string }> = {
  pending:    { en: "Pending",   ko: "대기" },
  scheduled:  { en: "Scheduled", ko: "예정" },
  completed:  { en: "Completed", ko: "종료" },
  cancelled:  { en: "Cancelled", ko: "취소" },
};

function matchStatusVariant(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "scheduled") return "scheduled";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "pending";
}

export function isCancelledMatch(matchStatus: string | null | undefined): boolean {
  return matchStatusVariant(matchStatus ?? "") === "cancelled";
}

export function matchStatusLabel(status: string, locale: "en" | "ko"): string {
  return MATCH_STATUS_LABELS[matchStatusVariant(status)]?.[locale] ?? status;
}

export function matchStatusChipClass(status: string): string {
  return `match-status-chip-${matchStatusVariant(status)}`;
}

const MATCH_STATUS_SORT_ORDER: Record<string, number> = {
  scheduled: 0,
  pending: 1,
  completed: 2,
  cancelled: 3,
};

/** Returns a numeric sort key for match status: scheduled < pending < completed < cancelled. */
export function matchStatusSortOrder(status: string): number {
  return MATCH_STATUS_SORT_ORDER[matchStatusVariant(status)] ?? 99;
}

/**
 * Sorts matches for public display: status order (scheduled → pending → completed → cancelled),
 * then time ascending within each status group (nulls last).
 */
export function sortMatchesForDisplay(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const sd = matchStatusSortOrder(a.matchStatus) - matchStatusSortOrder(b.matchStatus);
    if (sd !== 0) return sd;
    const ta = parseTimeToHHMM(a.time) || "00:00"; // nulls first when descending
    const tb = parseTimeToHHMM(b.time) || "00:00";
    return tb.localeCompare(ta); // descending — most recent time first
  });
}

/**
 * Extract the numeric sequence from a match ID.
 * Finds `roundCode` in the ID (using lastIndexOf), then reads past an optional
 * group letter, and returns the trailing integer — e.g. "25MD-GPREA10" with
 * roundCode "PRE" → 10.  Returns 0 if no number is found.
 */
export function matchSeqNumber(id: string, roundCode: string): number {
  if (!roundCode) return 0;
  const idx = id.lastIndexOf(roundCode);
  if (idx === -1) return 0;
  const after = id.slice(idx + roundCode.length);
  const m = /^[A-Za-z]?(\d+)$/.exec(after);
  return m ? parseInt(m[1]!, 10) : 0;
}

/** Format a time string (HH:MM 24h or H:MM AM/PM 12h) as 12h display, e.g. "8:41pm". */
export function formatTimeDisplay(time: string | null | undefined): string {
  if (!time?.trim()) return "—";
  const t = time.trim();
  // Range string (e.g. "7:00 – 9:00 PM") — extract start time and recurse
  if (t.includes("–")) {
    const [start] = t.split("–");
    const period = t.match(/\b(am|pm)\b/i)?.[1] ?? "";
    return formatTimeDisplay(period ? `${start.trim()} ${period}` : start.trim());
  }
  // Check 12h format first (e.g. "8:00 PM", "8:41pm") — must check BEFORE 24h
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    return `${parseInt(m12[1], 10)}:${m12[2]}${m12[3].toLowerCase()}`;
  }
  // 24h: "20:41" or "08:00"
  const m24 = t.match(/^(\d{1,2}):(\d{2})/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = m24[2];
    const period = h >= 12 ? "pm" : "am";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${min}${period}`;
  }
  return t;
}

/** Format an ISO date string (YYYY-MM-DD) as a short locale-aware date, e.g. "Aug 23" / "8월 23일". */
export function formatDateDisplay(dateStr: string | null | undefined, locale: "en" | "ko" = "en"): string {
  if (!dateStr?.trim()) return "—";
  const value = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return locale === "ko"
        ? date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }
  return value;
}

