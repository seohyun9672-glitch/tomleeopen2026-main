"use client";

import {
  Fragment,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, deriveGroupedCategoryOptions } from "@/lib/categories";
import type { CategoryRecord, CategoryYearStatusRow } from "@/lib/categories";
import type { Match } from "@/lib/matches";
import { isoDateLocal, matchStatusSortOrder, matchSeqNumber, formatDateDisplay, isCancelledMatch } from "@/lib/matches";
import { computePrelimStats, rankPrelimTeams, computeAdvancingRanks, computeExpectedAdvancingCount, type PrelimStats } from "@/lib/prelim";
import { getYear } from "@/lib/utils";
import type { TeamRecord } from "@/lib/teams";
import { ROUND_PRE, ROUND_QF, ROUND_SF, ROUND_F, ELIMINATION_ROUND_ORDER } from "@/lib/round";
import type { RoundRecord } from "@/lib/round";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout, type FilterConfig } from "@/app/components/database";
import { StageHeader } from "@/app/components/tree/StageHeader";
import { MatchCard } from "@/app/components/MatchCard";
import { Chip } from "@/app/components/ui/Chip";
import { Divider } from "@/app/components/ui/Divider";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import { Table } from "@/app/components/ui/table/Table";
import { getImportantDates } from "@/lib/importantDatesData";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowUp } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type KnockoutRound = {
  code: string;
  labelEn: string;
  labelKo: string;
  sortOrder: number;
  matches: Match[];
};

type RoundInfo = { code: string; labelEn: string; labelKo: string; sortOrder: number };

// ─── Round utilities ───────────────────────────────────────────────────────────

const ELIMINATION_ROUND_INDEX: Record<string, number> = Object.fromEntries(
  ELIMINATION_ROUND_ORDER.map((c, i) => [c, i])
);

function isPrelimRound(code: string): boolean {
  return code === ROUND_PRE;
}

function roundLabel(round: RoundInfo, locale: string): string {
  return locale === "ko" ? round.labelKo : round.labelEn;
}

function buildKnockoutRounds(matches: Match[]): KnockoutRound[] {
  const map = new Map<string, KnockoutRound>();
  for (const m of matches) {
    const r = m.round;
    if (!r || isPrelimRound(r.code)) continue;
    if (!map.has(r.code)) {
      map.set(r.code, { code: r.code, labelEn: r.labelEn, labelKo: r.labelKo, sortOrder: r.sortOrder, matches: [] });
    }
    map.get(r.code)!.matches.push(m);
  }
  return [...map.values()].sort((a, b) => {
    const ia = ELIMINATION_ROUND_INDEX[a.code] ?? a.sortOrder + 1000;
    const ib = ELIMINATION_ROUND_INDEX[b.code] ?? b.sortOrder + 1000;
    return ia - ib;
  });
}

// For elimination: always show the full bracket skeleton (R16/R32 → QF → SF → F),
// even if some rounds have no matches yet. Teams determine the first round.
function buildEliminationKnockoutRounds(
  matches: Match[],
  teamCount: number,
  allRounds: RoundRecord[],
): KnockoutRound[] {
  // Collect existing matches by round code
  const matchesByRound = new Map<string, Match[]>();
  for (const m of matches) {
    const code = m.round?.code;
    if (!code || isPrelimRound(code)) continue;
    if (!matchesByRound.has(code)) matchesByRound.set(code, []);
    matchesByRound.get(code)!.push(m);
  }

  // Determine which skeleton rounds to show: R32 only if ≥32 teams
  const firstRoundCode = teamCount >= 32 ? "R32" : "R16";
  const firstIdx = ELIMINATION_ROUND_ORDER.indexOf(firstRoundCode);
  const expectedCodes = ELIMINATION_ROUND_ORDER.slice(firstIdx); // e.g. ["R16","QF","SF","F"]

  const roundByCode = new Map(allRounds.map((r) => [r.code, r]));

  return expectedCodes
    .map((code) => {
      const roundMeta = roundByCode.get(code);
      if (!roundMeta) return null;
      return {
        code,
        labelEn: roundMeta.labelEn,
        labelKo: roundMeta.labelKo,
        sortOrder: roundMeta.sortOrder,
        matches: matchesByRound.get(code) ?? [],
      };
    })
    .filter((r): r is KnockoutRound => r !== null);
}

function buildAvailableRounds(matches: Match[]): RoundInfo[] {
  const map = new Map<string, RoundInfo>();
  for (const m of matches) {
    const r = m.round;
    if (r && !map.has(r.code)) {
      map.set(r.code, { code: r.code, labelEn: r.labelEn, labelKo: r.labelKo, sortOrder: r.sortOrder });
    }
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function computeDefaultStageCode(
  availableRounds: RoundInfo[],
  roundDateRanges: Map<string, { start: string | null; end: string | null }>,
  today: string,
): string {
  // Whichever round's date range today actually falls inside — e.g. today
  // sitting in the prelim window defaults to prelim, in the SF window
  // defaults to SF, etc.
  for (const { code } of availableRounds) {
    const range = roundDateRanges.get(code);
    if (range?.start && range.end && today >= range.start && today <= range.end) return code;
  }
  // Today doesn't land inside any round's window (e.g. between two rounds,
  // or past the last one) — fall back to the latest round whose window has
  // already started.
  let latestStarted: string | null = null;
  for (const { code } of availableRounds) {
    const range = roundDateRanges.get(code);
    if (range?.start && range.start <= today) latestStarted = code;
  }
  return latestStarted ?? availableRounds[0]?.code ?? ROUND_PRE;
}

// ─── Round date ranges ─────────────────────────────────────────────────────────

function formatDateRange(start: string | null, end: string | null, locale: string): string {
  if (!start) return "";
  const s = formatDateDisplay(start, locale as "en" | "ko");
  if (!end || end === start) return s;
  const e = formatDateDisplay(end, locale as "en" | "ko");
  return `${s} – ${e}`;
}

function minDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  return valid.length ? valid.sort()[0]! : null;
}

function maxDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  return valid.length ? valid.sort().at(-1)! : null;
}

const ROUND_CODE_TO_IMPORTANT_DATE_LABEL: Partial<Record<string, string>> = {
  [ROUND_PRE]: "Preliminaries",
  [ROUND_QF]: "Quarterfinals",
  [ROUND_SF]: "Semifinals",
  [ROUND_F]: "Final",
};

function getImportantDateRange(roundCode: string, year: number): { start: string; end: string } | null {
  const label = ROUND_CODE_TO_IMPORTANT_DATE_LABEL[roundCode];
  if (!label) return null;
  const entry = getImportantDates(year).find((e) => e.label === label);
  if (!entry) return null;
  if (entry.type === "range") return { start: entry.startDate, end: entry.endDate };
  if (entry.type === "date") return { start: entry.date, end: entry.date };
  return null;
}

/**
 * Compute the display date range for each round code.
 * For year 2026, uses importantDates fixed schedule.
 * For PRE: if QF is absent, end extends through the QF period; if SF also absent, through SF period.
 */
function computeRoundDateRanges(
  matches: Match[],
  year: number,
): Map<string, { start: string | null; end: string | null }> {
  const byRound = new Map<string, string[]>();
  const roundCodes = new Set<string>();
  for (const m of matches) {
    if (!m.round) continue;
    const code = m.round.code;
    roundCodes.add(code);
    if (!m.date) continue;
    if (!byRound.has(code)) byRound.set(code, []);
    byRound.get(code)!.push(m.date);
  }

  const hasQF = roundCodes.has(ROUND_QF);
  const hasSF = roundCodes.has(ROUND_SF);
  const hasTournamentDates = getImportantDates(year).length > 0;

  const result = new Map<string, { start: string | null; end: string | null }>();

  if (hasTournamentDates) {
    // Populate from importantDates for all rounds that appear in this category's matches
    for (const code of [ROUND_PRE, ROUND_QF, ROUND_SF, ROUND_F]) {
      if (!roundCodes.has(code) && code !== ROUND_PRE) continue;
      const fixed = getImportantDateRange(code, year);
      if (fixed) result.set(code, { start: fixed.start, end: fixed.end });
    }

    // PRE extension: if no QF matches, prelim covers through QF period; if also no SF, through SF period
    const preEntry = result.get(ROUND_PRE);
    if (preEntry && !hasQF) {
      const extendTo = !hasSF
        ? getImportantDateRange(ROUND_SF, year)
        : getImportantDateRange(ROUND_QF, year);
      if (extendTo) preEntry.end = extendTo.end;
    }
  } else {
    for (const [code, dates] of byRound) {
      result.set(code, { start: minDate(dates), end: maxDate(dates) });
    }

    // PRE extension for non-2026: end at day before the next existing round
    const preEntry = result.get(ROUND_PRE);
    if (preEntry && !hasQF) {
      const nextRoundFirstDate = !hasSF
        ? minDate(byRound.get(ROUND_F) ?? [])
        : minDate(byRound.get(ROUND_SF) ?? []);
      if (nextRoundFirstDate) {
        const d = new Date(`${nextRoundFirstDate}T12:00:00`);
        d.setDate(d.getDate() - 1);
        preEntry.end = d.toISOString().slice(0, 10);
      }
    }
  }

  return result;
}

// ─── Prelim stats ──────────────────────────────────────────────────────────────

function prelimMatchesOf(matches: Match[]): Match[] {
  return matches.filter((m) => m.round?.code === ROUND_PRE);
}

function computePrelimStatsFromMatches(matches: Match[]): Map<string, PrelimStats> {
  return computePrelimStats(prelimMatchesOf(matches));
}

/** True once every prelim match involving any of `ids` has a result (completed or cancelled).
 * Standings — and especially a "tied, needs a draw" verdict — are only meaningful for seeding
 * the next round once the group is actually finished; mid-tournament, an apparent tie can still
 * be broken by matches that haven't been played yet. */
function isGroupDecided(ids: string[], prelims: Match[]): boolean {
  const idSet = new Set(ids);
  const relevant = prelims.filter((m) => (m.team1Id != null && idSet.has(m.team1Id)) || (m.team2Id != null && idSet.has(m.team2Id)));
  return relevant.length > 0 && relevant.every((m) => m.matchStatus === "Completed" || isCancelledMatch(m.matchStatus));
}

/** Ranks `ids` per the tie-break priority (win% → SD → SD-among-tied → GD → GD-among-tied → super TB → lots).
 *
 * While the group is still in progress, forcing a strict order via tie-break refinements that
 * depend on matches not yet played would be misleading — teams tied on their current stats just
 * share a rank number, same as any live standings table.
 *
 * Once the group is fully decided, the rank becomes what actually seeds the next round: teams
 * are given a distinct, sequential rank UNLESS they're still tied after every real criterion
 * (win% → SD → SD-among-tied → GD → GD-among-tied → super TB) — that's a genuine "drawing of
 * lots" case, so those teams share a rank and get flagged via `tied` instead of an invented order. */
function rankAndAssign<T extends { teamId: string }>(rows: T[], prelims: Match[], tiebreakOverrides?: Map<string, number>): (T & { rank: number; tied: boolean })[] {
  const ids = rows.map((r) => r.teamId);
  const rowById = new Map(rows.map((r) => [r.teamId, r]));

  if (!isGroupDecided(ids, prelims)) {
    const stats = computePrelimStats(prelims);
    const statOf = (id: string) => stats.get(id) ?? { w: 0, l: 0, sd: 0, gd: 0, td: 0 };
    const winPctOf = (id: string) => { const s = statOf(id); return s.w + s.l > 0 ? s.w / (s.w + s.l) : -1; };
    const order = [...ids].sort((a, b) => {
      const sa = statOf(a); const sb = statOf(b);
      return winPctOf(b) - winPctOf(a) || sb.sd - sa.sd || sb.gd - sa.gd || sb.td - sa.td;
    });
    let currentRank = 0; let prevKey: string | null = null;
    return order.map((teamId, i) => {
      const s = statOf(teamId);
      const key = `${winPctOf(teamId)}|${s.sd}|${s.gd}|${s.td}`;
      if (prevKey !== key) currentRank = i + 1;
      prevKey = key;
      return { ...rowById.get(teamId)!, rank: currentRank, tied: false };
    });
  }

  const { order, tiedGroups } = rankPrelimTeams(ids, prelims, tiebreakOverrides);
  const tiedGroupOf = new Map<string, number>();
  tiedGroups.forEach((g, gi) => g.forEach((id) => tiedGroupOf.set(id, gi)));
  let currentRank = 0; let prevGroup: number | undefined;
  return order.map((teamId, i) => {
    const myGroup = tiedGroupOf.get(teamId);
    if (myGroup === undefined || myGroup !== prevGroup) currentRank = i + 1;
    prevGroup = myGroup;
    return { ...rowById.get(teamId)!, rank: currentRank, tied: myGroup !== undefined };
  });
}


// ─── Prelim leaderboard ────────────────────────────────────────────────────────

type LeaderboardRow = {
  rank: number; seed: string;
  player1: string; player2?: string; player1Ko?: string; player2Ko?: string;
  w: number; l: number; sd: number; gd: number; td: number; teamId: string; withdrawn: boolean;
  tied: boolean;
};

type DisplayInfo = { seed: string; player1: string; player2?: string; player1Ko?: string; player2Ko?: string; withdrawn: boolean };

function buildDisplayMapFromTeams(teams: TeamRecord[]): Map<string, DisplayInfo> {
  const map = new Map<string, DisplayInfo>();
  for (const t of teams) {
    map.set(t.id, {
      seed: t.seed ?? "—",
      player1: t.member1NameEn || "—",
      player2: t.member2NameEn ?? undefined,
      player1Ko: t.member1NameKo ?? undefined,
      player2Ko: t.member2NameKo ?? undefined,
      withdrawn: t.withdrawn,
    });
  }
  return map;
}

function buildDisplayMapFromMatches(prelims: Match[]): Map<string, DisplayInfo> {
  const map = new Map<string, DisplayInfo>();
  for (const m of prelims) {
    for (const [teamId, groupCode, name, nameKo] of [
      [m.team1Id, m.team1Seed, m.team1DisplayName, m.team1DisplayNameKo],
      [m.team2Id, m.team2Seed, m.team2DisplayName, m.team2DisplayNameKo],
    ] as Array<[string | null, string | null, string | null, string | null]>) {
      if (!teamId) continue;
      const names = (name ?? "—").trim().split(/\s*\/\s*/).filter(Boolean);
      const namesKo = (nameKo ?? "").trim() ? (nameKo ?? "").split(/\s*\/\s*/).filter(Boolean) : [];
      if (!map.has(teamId)) {
        map.set(teamId, {
          seed: (groupCode ?? "—").trim() || "—",
          player1: names[0] ?? "—", player2: names[1],
          player1Ko: namesKo[0], player2Ko: namesKo[1],
          withdrawn: false,
        });
      } else {
        const info = map.get(teamId)!;
        if (!info.player1Ko && namesKo[0]) info.player1Ko = namesKo[0];
        if (!info.player2Ko && namesKo[1]) info.player2Ko = namesKo[1];
      }
    }
  }
  return map;
}

function buildLeaderboard(categoryMatches: Match[], categoryTeams: TeamRecord[]): LeaderboardRow[] | null {
  const statsMap = computePrelimStatsFromMatches(categoryMatches);
  const prelims = prelimMatchesOf(categoryMatches);

  // Primary: use team records as the authoritative source (shows teams with 0 matches,
  // regardless of whether a seed has been assigned yet)
  if (categoryTeams.length >= 2) {
    const displayMap = buildDisplayMapFromTeams(categoryTeams);
    const allRows = categoryTeams
      .filter((t) => displayMap.has(t.id))
      .map((t) => ({ teamId: t.id, ...displayMap.get(t.id)!, ...(statsMap.get(t.id) ?? { w: 0, l: 0, sd: 0, gd: 0, td: 0 }) }));
    if (allRows.length < 2) return null;
    const overrides = new Map(
      categoryTeams.filter((t): t is TeamRecord & { tiebreakOverride: number } => t.tiebreakOverride != null).map((t) => [t.id, t.tiebreakOverride])
    );
    return rankAndAssign(allRows, prelims, overrides);
  }

  // Fallback: derive from match data (legacy path when no team records have seeds)
  if (prelims.length === 0) return null;
  if (statsMap.size < 2) return null;
  const displayMap = buildDisplayMapFromMatches(prelims);
  const allRows = [...statsMap.keys()]
    .filter((id) => displayMap.has(id))
    .map((teamId) => ({ teamId, ...displayMap.get(teamId)!, ...statsMap.get(teamId)! }));
  if (allRows.length < 2) return null;
  return rankAndAssign(allRows, prelims);
}

// ─── Prelim match sorting ──────────────────────────────────────────────────────

function sortPrelimMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const statusDiff = matchStatusSortOrder(a.matchStatus) - matchStatusSortOrder(b.matchStatus);
    if (statusDiff !== 0) return statusDiff;
    const seqDiff = matchSeqNumber(a.id, a.round?.code ?? ROUND_PRE) - matchSeqNumber(b.id, b.round?.code ?? ROUND_PRE);
    if (seqDiff !== 0) return seqDiff;
    return a.id.localeCompare(b.id);
  });
}

// ─── Bracket geometry ──────────────────────────────────────────────────────────

const CONNECTOR_WIDTH = 40;
const SLOT_HEIGHT = 220;
const SLOT_GAP = 20;
const HEADER_BAND_FALLBACK = 54;
const STROKE = 1.5;

// ─── Bracket helpers ──────────────────────────────────────────────────────────

function resolveBracketTeamDisplayRank(
  teamId: string | null | undefined,
  seed: string | null | undefined,
  rankMap: Map<string, number>
): number | null {
  if (!teamId) return null;
  const fromMap = rankMap.get(teamId);
  if (fromMap != null) return fromMap;
  const parsed = parseInt(seed ?? "", 10);
  return isNaN(parsed) ? null : parsed;
}


type RoundGeom = { centers: number[]; height: number };

function sortByMatchId(matches: Match[]): Match[] {
  return [...matches].sort((a, b) =>
    matchSeqNumber(a.id, a.round?.code ?? "") - matchSeqNumber(b.id, b.round?.code ?? "")
  );
}

function mergeCentersToCount(centers: number[], target: number, H: number): number[] {
  if (target <= 0) return [];
  let c = [...centers];
  while (c.length > target) {
    const next: number[] = [];
    for (let j = 0; j + 1 < c.length; j += 2) next.push((c[j]! + c[j + 1]!) / 2);
    if (c.length % 2 === 1) next.push(c[c.length - 1]!);
    c = next;
  }
  if (c.length === target) return c;
  if (c.length < target) return Array.from({ length: target }, (_, k) => ((k + 1) * H) / (target + 1));
  return c;
}

function computeRoundGeometries(
  rounds: { code: string; matches: Match[] }[],
  slotH: number,
  gap: number,
): { geoms: Map<string, RoundGeom>; bracketHeight: number } {
  if (rounds.length === 0) return { geoms: new Map(), bracketHeight: 0 };
  const stride = slotH + gap;
  let carry: number[] | null = null;
  let H = 0;
  const geoms = new Map<string, RoundGeom>();
  for (const { code, matches } of rounds) {
    const n = matches.length;
    if (carry === null) {
      H = n * slotH + Math.max(0, n - 1) * gap;
      carry = Array.from({ length: n }, (_, k) => k * stride + slotH / 2);
    } else if (code === ROUND_F && n === 2) {
      // Finals column: center the 2 matches (gold + bronze) rather than chain from previous
      const blockH = 2 * slotH + gap;
      const pad = Math.max(0, (H - blockH) / 2);
      carry = [pad + slotH / 2, pad + slotH + gap + slotH / 2];
    } else {
      carry = mergeCentersToCount(carry!, n, H);
    }
    geoms.set(code, { centers: [...carry!], height: H });
  }
  return { geoms, bracketHeight: H };
}

// ─── Bracket components ────────────────────────────────────────────────────────

function BracketConnector({
  leftCenters,
  height,
  rightCenters,
}: {
  leftCenters: number[];
  height: number;
  rightCenters: number[];
}) {
  const w = CONNECTOR_WIDTH;
  const h = Math.max(1, height);
  const midX = w / 2;
  if (leftCenters.length < 2) {
    const y = leftCenters[0] ?? h / 2;
    return (
      <svg width="100%" height="100%" className="block text-[color:var(--bracket-connector-color)]" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1={0} y1={y} x2={w} y2={y} stroke="currentColor" strokeWidth={STROKE} />
      </svg>
    );
  }
  const pairCount = Math.floor(leftCenters.length / 2);
  return (
    <svg width="100%" height="100%" className="block text-[color:var(--bracket-connector-color)]" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {leftCenters.map((y, i) => (
        <line key={`lh-${i}`} x1={0} y1={y} x2={midX} y2={y} stroke="currentColor" strokeWidth={STROKE} />
      ))}
      {Array.from({ length: pairCount }, (_, i) => {
        const topY = leftCenters[i * 2]!;
        const botY = leftCenters[i * 2 + 1]!;
        const rightY = rightCenters[i] ?? (topY + botY) / 2;
        return (
          <g key={`p-${i}`}>
            <line x1={midX} y1={topY} x2={midX} y2={botY} stroke="currentColor" strokeWidth={STROKE} />
            <line x1={midX} y1={rightY} x2={w} y2={rightY} stroke="currentColor" strokeWidth={STROKE} />
          </g>
        );
      })}
    </svg>
  );
}

function ConnectorColumn({
  headerSpacer,
  bodyHeight,
  children,
}: {
  headerSpacer: number;
  bodyHeight: number;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col self-start" style={{ width: CONNECTOR_WIDTH }} aria-hidden>
      <div style={{ height: headerSpacer }} />
      <div style={{ height: bodyHeight }}>{children}</div>
    </div>
  );
}

const BracketAlignedColumn = memo(function BracketAlignedColumn({
  matches,
  geom,
  teamRankById,
}: {
  matches: Match[];
  geom: RoundGeom | undefined;
  teamRankById: Map<string, number>;
}) {
  if (!geom || matches.length === 0) return null;
  const { centers, height } = geom;
  return (
    <div data-bracket-stack className="relative w-full" style={{ height }}>
      {matches.map((m, i) => {
        const cy = centers[i];
        if (cy == null) return null;
        return (
          <div
            key={m.id}
            data-bracket-match
            className="absolute left-0 right-0 w-full min-w-0 px-0 md:px-0.5"
            style={{ top: cy, transform: "translateY(-50%)" }}
          >
            <MatchCard
              omitCategoryInHeader
              match={m}
              team1GlobalRank={resolveBracketTeamDisplayRank(m.team1Id, m.team1Seed, teamRankById)}
              team2GlobalRank={resolveBracketTeamDisplayRank(m.team2Id, m.team2Seed, teamRankById)}
            />
          </div>
        );
      })}
    </div>
  );
});

const BracketMobileStack = memo(function BracketMobileStack({
  matches,
  teamRankById,
}: {
  matches: Match[];
  teamRankById: Map<string, number>;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="flex w-full flex-col items-stretch justify-start gap-5">
      {matches.map((m) => (
        <div key={m.id} className="w-full min-w-0 shrink-0">
          <MatchCard
            omitCategoryInHeader
            match={m}
            team1GlobalRank={resolveBracketTeamDisplayRank(m.team1Id, m.team1Seed, teamRankById)}
            team2GlobalRank={resolveBracketTeamDisplayRank(m.team2Id, m.team2Seed, teamRankById)}
          />
        </div>
      ))}
    </div>
  );
});

// ─── BracketView ──────────────────────────────────────────────────────────────

type BracketViewProps = {
  knockoutRounds: KnockoutRound[];
  teamRankById: Map<string, number>;
  activeRoundCode: string;
  locale: string;
  roundDateRanges: Map<string, { start: string | null; end: string | null }>;
};

function BracketView({ knockoutRounds, teamRankById, activeRoundCode, locale, roundDateRanges }: BracketViewProps) {
  const sortedRounds = useMemo(
    () => knockoutRounds.map((r) => ({ ...r, matches: sortByMatchId(r.matches) })),
    [knockoutRounds],
  );
  const layoutKey = useMemo(
    () => sortedRounds.map((r) => r.matches.map((m) => m.id).join("|")).join("~"),
    [sortedRounds],
  );

  const bracketRowRef = useRef<HTMLDivElement>(null);
  const [slotH, setSlotH] = useState(SLOT_HEIGHT);
  const [headerBand, setHeaderBand] = useState(HEADER_BAND_FALLBACK);

  const { geoms, bracketHeight: H } = useMemo(
    () => computeRoundGeometries(sortedRounds, slotH, SLOT_GAP),
    [sortedRounds, slotH],
  );

  useLayoutEffect(() => {
    const row = bracketRowRef.current;
    if (!row) return;
    const measure = () => {
      const els = row.querySelectorAll<HTMLElement>("[data-bracket-match]");
      let m = SLOT_HEIGHT;
      els.forEach((el) => {
        const h = el.getBoundingClientRect().height;
        if (h > 0) m = Math.max(m, Math.ceil(h));
      });
      setSlotH((prev) => (Math.abs(prev - m) > 1 ? m : prev));
      const stack = row.querySelector<HTMLElement>("[data-bracket-stack]");
      if (stack) {
        const pad = Math.max(0, stack.getBoundingClientRect().top - row.getBoundingClientRect().top);
        setHeaderBand((prev) => (Math.abs(prev - pad) > 0.5 ? pad : prev));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [layoutKey, H]);

  if (sortedRounds.length === 0) return null;

  const singleFinalFullWidth = sortedRounds.length === 1 && sortedRounds[0]!.matches.length === 1;
  const colClass = singleFinalFullWidth
    ? "w-full min-w-0 shrink-0 grow"
    : "min-w-[var(--match-card-min-width)] flex-1 basis-0 shrink-0";

  const mobileRound = knockoutRounds.find((r) => r.code === activeRoundCode);
  const mobileMatches = mobileRound ? sortByMatchId(mobileRound.matches) : null;

  const renderCol = (r: KnockoutRound & { matches: Match[] }) => {
    const range = roundDateRanges.get(r.code);
    const subtitle = range ? formatDateRange(range.start, range.end, locale) : undefined;
    return (
    <div className={`flex flex-col self-start ${colClass}`}>
      <StageHeader title={roundLabel(r, locale)} subtitle={subtitle || undefined} />
      <div className="pt-4 md:pt-5">
        <BracketAlignedColumn matches={r.matches} geom={geoms.get(r.code)} teamRankById={teamRankById} />
      </div>
    </div>
    );
  };

  return (
    <>
      {mobileMatches && mobileMatches.length > 0 && (
        <div className="w-full md:hidden">
          <BracketMobileStack matches={mobileMatches} teamRankById={teamRankById} />
        </div>
      )}
      <div className={`hidden w-full py-4 md:block ${singleFinalFullWidth ? "" : "overflow-x-auto"}`}>
        <div
          ref={bracketRowRef}
          className={`flex items-start gap-0 px-0 pb-2 pt-0 ${singleFinalFullWidth ? "w-full" : "w-full min-w-max"}`}
          style={{ minHeight: headerBand + H }}
        >
          {sortedRounds.map((r, i) => {
            const next = sortedRounds[i + 1];
            const currGeom = geoms.get(r.code);
            const nextGeom = next ? geoms.get(next.code) : undefined;
            return (
              <Fragment key={r.code}>
                {renderCol(r)}
                {next && currGeom && nextGeom && (
                  <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
                    <BracketConnector leftCenters={currGeom.centers} height={H} rightCenters={nextGeom.centers} />
                  </ConnectorColumn>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Hub types ────────────────────────────────────────────────────────────────

type Props = { categories: CategoryRecord[]; allMatches: Match[]; allTeams: TeamRecord[]; allRounds: RoundRecord[]; categoryStatuses: CategoryYearStatusRow[] };

// ─── Hub state ────────────────────────────────────────────────────────────────

function useDrawsState({ categories, allMatches, allTeams, allRounds, categoryStatuses }: Props) {
  const today = isoDateLocal();

  const years = useMemo(
    () => [...new Set(allMatches.map((m) => m.tournamentYear))].sort((a, b) => b - a),
    [allMatches],
  );
  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const year = yearParamNum > 0 && years.includes(yearParamNum) ? yearParamNum : (years[0] ?? getYear());
  // Deliberately doesn't clear any other params — switching years shouldn't
  // reset the URL; category/stage/seed just gracefully fall back to their
  // own defaults below if they're no longer valid for the new year.
  const setYear = useCallback((y: number) => setYearParam(String(y)), [setYearParam]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoriesToShow = useMemo(
    () => categories.filter((c) =>
      allMatches.some((m) => m.tournamentYear === year && m.categoryId === c.id)
    ),
    [categories, year, allMatches],
  );
  const presentCategoryIds = useMemo(() => categoriesToShow.map((c) => c.id), [categoriesToShow]);
  const allCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  // Single grouped category+tier filter (not split into two cascading
  // dropdowns) — each option is a real category id, grouped visually by
  // category-group in the popover.
  const [rawCategoryParam, setCategoryParam] = useUrlParam("cat");
  const categoryOptions = useMemo(
    () => deriveGroupedCategoryOptions(presentCategoryIds, categoriesById),
    [presentCategoryIds, categoriesById],
  );
  // Validate against every known category (not just ones with matches for
  // this particular year) so switching years doesn't silently snap the
  // selection to "first available" just because the new year's matches
  // haven't been generated yet — only fall back if the param isn't a real
  // category at all.
  const categoryId = allCategoryIds.includes(rawCategoryParam)
    ? rawCategoryParam
    : (categoriesToShow[0]?.id ?? "");
  const setCategoryId = useCallback((id: string) => setCategoryParam(id, { clear: ["seed"] }), [setCategoryParam]);

  const categoryMatches = useMemo(
    () => allMatches.filter((m) => m.tournamentYear === year && m.categoryId === categoryId),
    [allMatches, year, categoryId],
  );
  const categoryTeams = useMemo(
    () => allTeams.filter((t) => t.tournamentYear === year && t.categoryId === categoryId),
    [allTeams, year, categoryId],
  );

  const isElimination = useMemo(() => {
    const yearStatus = categoryStatuses.find((s) => s.tournamentYear === year && s.categoryId === categoryId);
    const format = yearStatus?.prelimFormat ?? categories.find((c) => c.id === categoryId)?.prelimFormat;
    return format === "ELIMINATION";
  }, [categoryStatuses, categories, year, categoryId]);

  const availableRounds = useMemo(() => buildAvailableRounds(categoryMatches), [categoryMatches]);
  const prelimMatches = useMemo(
    () => categoryMatches.filter((m) => m.round?.code === ROUND_PRE),
    [categoryMatches],
  );
  const knockoutRounds = useMemo(() => {
    if (isElimination) {
      return buildEliminationKnockoutRounds(categoryMatches, categoryTeams.length, allRounds);
    }
    return buildKnockoutRounds(categoryMatches);
  }, [isElimination, categoryMatches, categoryTeams, allRounds]);

  const hasPrelim = !isElimination && (prelimMatches.length > 0 || categoryTeams.some((t) => t.seed));
  const hasKnockout = knockoutRounds.length > 0;

  const roundDateRanges = useMemo(
    () => computeRoundDateRanges(categoryMatches, year),
    [categoryMatches, year],
  );

  const defaultStageCode = useMemo(
    () => computeDefaultStageCode(availableRounds, roundDateRanges, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableRounds, roundDateRanges],
  );

  const [stageParam, setStageParam] = useUrlParam("stage");

  // For elimination, valid stages include the full skeleton (R16/R32–F), even rounds
  // without matches yet. For other formats, only rounds with actual matches are valid —
  // a round is reachable as soon as its placeholder row exists, regardless of whether
  // teams have been assigned into it yet.
  const validStageCodes = useMemo(
    () => new Set(isElimination ? knockoutRounds.map((r) => r.code) : availableRounds.map((r) => r.code)),
    [isElimination, knockoutRounds, availableRounds],
  );

  // Every round now has a pre-generated placeholder Match row from the
  // start (regardless of whether it's actually been played), so
  // `validStageCodes` includes every round code almost immediately — it can
  // no longer be used to tell "the user picked this" apart from "this is a
  // stale/leftover URL param". Track whether the user has ever explicitly
  // picked a round in this session (not scoped to a particular year or
  // category — an explicit pick should survive switching either filter),
  // so a stale `stage` param (old link, previous session) doesn't outrank
  // today's date-based default on first load, but a deliberate choice
  // isn't silently discarded just because another filter changed.
  const hasExplicitStagePickRef = useRef(false);

  const stageCode: string = useMemo(() => {
    const isValid = hasExplicitStagePickRef.current && validStageCodes.has(stageParam ?? "");
    const resolved = isValid ? stageParam! : defaultStageCode;
    if (isPrelimRound(resolved) && !hasPrelim) {
      return knockoutRounds[0]?.code ?? resolved;
    }
    return resolved;
  }, [stageParam, defaultStageCode, validStageCodes, hasPrelim, knockoutRounds]);

  const setStageCode = useCallback(
    (code: string) => {
      hasExplicitStagePickRef.current = true;
      setStageParam(code, { clear: ["seed"] });
    },
    [setStageParam],
  );

  useLayoutEffect(() => {
    const isValid = hasExplicitStagePickRef.current && validStageCodes.has(stageParam ?? "");
    if (!isValid || (isPrelimRound(stageParam ?? "") && !hasPrelim)) {
      setStageParam(defaultStageCode);
    }
    // Re-run whenever the valid stage set changes (e.g. switching year or
    // category without a remount) — not just on mount — so a stale "stage"
    // URL param (and the derived prelim/knockout Round toggle) self-corrects
    // instead of only fixing the *displayed* fallback while the URL lags.
  }, [year, categoryId, stageParam, validStageCodes, hasPrelim, defaultStageCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rawSeedParam, setSeedParam] = useUrlParam("seed");
  const seedOptions = useMemo(() => {
    if (isElimination) return [];
    const fromTeams = categoryTeams.map((t) => t.seed).filter(Boolean) as string[];
    if (fromTeams.length > 0) return [...new Set(fromTeams)].sort();
    const seen = new Set<string>();
    for (const m of prelimMatches) {
      if (m.team1Seed?.trim()) seen.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) seen.add(m.team2Seed.trim());
    }
    return [...seen].sort();
  }, [isElimination, categoryTeams, prelimMatches]);
  // "all" is the sentinel URL value for the "All groups" tab — it resolves to
  // an empty activeSeed (no group filter). That's also the default when the
  // param is unset/invalid, so the prelim board opens on the global view.
  const activeSeed = rawSeedParam === "all"
    ? ""
    : seedOptions.includes(rawSeedParam ?? "")
      ? (rawSeedParam ?? "")
      : "";
  const activeSeedTab = activeSeed || "all";

  const hasSemis = useMemo(
    () => categoryMatches.some((m) => m.round?.code === ROUND_SF),
    [categoryMatches],
  );
  const advancingResult = useMemo(
    () => isElimination ? { ranks: new Map<string, number>(), tiedGroups: [] } : computeAdvancingRanks(prelimMatches, categoryTeams, hasSemis),
    [isElimination, prelimMatches, categoryTeams, hasSemis],
  );
  const teamRankById = advancingResult.ranks;
  const expectedAdvancingCount = useMemo(
    () => isElimination ? 0 : computeExpectedAdvancingCount(categoryTeams, hasSemis),
    [isElimination, categoryTeams, hasSemis],
  );

  // For elimination: mobile nav uses only knockout rounds in canonical order (R16/R32 → QF → SF → F).
  // For non-elimination: include all rounds (PRE first, then knockout) in DB sort order.
  const orderedRoundCodes = useMemo(() => {
    if (isElimination) {
      return Object.keys(ELIMINATION_ROUND_INDEX)
        .sort((a, b) => ELIMINATION_ROUND_INDEX[a]! - ELIMINATION_ROUND_INDEX[b]!)
        .filter((code) => knockoutRounds.some((r) => r.code === code));
    }
    return availableRounds.map((r) => r.code);
  }, [isElimination, knockoutRounds, availableRounds]);
  const navIndex = orderedRoundCodes.indexOf(stageCode);
  const mobilePrevCode = navIndex > 0 ? orderedRoundCodes[navIndex - 1] : null;
  const mobileNextCode = navIndex >= 0 && navIndex < orderedRoundCodes.length - 1 ? orderedRoundCodes[navIndex + 1] : null;

  return {
    year, setYear, years,
    categoryId, setCategoryId, categoryOptions,
    stageCode, setStageCode,
    availableRounds,
    isElimination,
    prelimMatches, knockoutRounds,
    hasPrelim, hasKnockout,
    activeSeed, activeSeedTab, setSeedParam, seedOptions,
    teamRankById, expectedAdvancingCount,
    orderedRoundCodes, mobilePrevCode, mobileNextCode,
    categoryMatches, categoryTeams, today,
    roundDateRanges,
  };
}

// ─── DrawsHub ─────────────────────────────────────────────────────────────────

export function DrawsHub(props: Props) {
  const { t, locale } = useLocale();
  const {
    year, setYear, years,
    categoryId, setCategoryId, categoryOptions,
    stageCode, setStageCode,
    availableRounds,
    isElimination,
    prelimMatches, knockoutRounds,
    hasPrelim, hasKnockout,
    activeSeed, activeSeedTab, setSeedParam, seedOptions,
    teamRankById, expectedAdvancingCount,
    orderedRoundCodes, mobilePrevCode, mobileNextCode,
    categoryMatches, categoryTeams, today,
    roundDateRanges,
  } = useDrawsState(props);

  const isPrelim = !isElimination && isPrelimRound(stageCode);
  const showMobileStageNav = orderedRoundCodes.length > 1;

  const stageTitle = useMemo(() => {
    const r = availableRounds.find((r) => r.code === stageCode);
    return r ? roundLabel(r, locale) : "";
  }, [availableRounds, stageCode, locale]);

  const stageDateLabel = useMemo(() => {
    const range = roundDateRanges.get(stageCode);
    return range ? formatDateRange(range.start, range.end, locale) : "";
  }, [roundDateRanges, stageCode, locale]);

  // Prelim toggle + group filter — GRR / RR only
  const roundFilterOptions = useMemo(() => {
    if (isElimination) return [];
    const opts: { value: string; label: string }[] = [];
    if (hasPrelim) {
      const pr = availableRounds.find((r) => isPrelimRound(r.code));
      opts.push({ value: "prelim", label: pr ? roundLabel(pr, locale) : t.drawsPage.prelims.prelimsMatches });
    }
    if (hasKnockout) opts.push({ value: "knockout", label: t.drawsPage.drawStageFinalsBracket });
    return opts;
  }, [isElimination, hasPrelim, hasKnockout, availableRounds, locale, t.drawsPage.drawStageFinalsBracket, t.drawsPage.prelims.prelimsMatches]);

  const handleRoundFilterChange = useCallback((value: string) => {
    if (value === "prelim") {
      setStageCode(ROUND_PRE);
    } else {
      const latest = knockoutRounds.reduce<string | null>((acc, r) => {
        const started = r.matches.some((m) => m.date != null && m.date <= today);
        return started ? r.code : acc;
      }, null);
      setStageCode(latest ?? knockoutRounds[0]?.code ?? "");
    }
  }, [setStageCode, knockoutRounds, today]);

  // Leaderboard — GRR / RR only
  const allLeaderboardRows = useMemo(
    () => isElimination ? null : buildLeaderboard(categoryMatches, categoryTeams),
    [isElimination, categoryMatches, categoryTeams],
  );
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    (allLeaderboardRows ?? []).forEach((r) => map.set(r.teamId, r.rank));
    return map;
  }, [allLeaderboardRows]);
  const leaderboardRows = useMemo(() => {
    if (!allLeaderboardRows) return null;
    if (!activeSeed) return allLeaderboardRows;
    // Re-rank within just this group's members — a group's matches never
    // cross with another group's, so this is equivalent to (and safer than)
    // renumbering a slice of the already-computed global order.
    const filtered = allLeaderboardRows.filter((r) => r.seed === activeSeed);
    const overrides = new Map(
      categoryTeams.filter((t): t is TeamRecord & { tiebreakOverride: number } => t.tiebreakOverride != null).map((t) => [t.id, t.tiebreakOverride])
    );
    return rankAndAssign(filtered, prelimMatches, overrides);
  }, [allLeaderboardRows, activeSeed, prelimMatches, categoryTeams]);

  const prelimMatchesFiltered = useMemo(() => {
    if (isElimination) return [];
    const filtered = activeSeed
      ? prelimMatches.filter((m) => m.team1Seed?.trim() === activeSeed || m.team2Seed?.trim() === activeSeed)
      : prelimMatches;
    return sortPrelimMatches(filtered);
  }, [isElimination, prelimMatches, activeSeed]);

  const prelimProgress = useMemo(() => {
    const scoped = activeSeed
      ? prelimMatches.filter((m) => m.team1Seed?.trim() === activeSeed || m.team2Seed?.trim() === activeSeed)
      : prelimMatches;
    const total = scoped.length;
    const completed = scoped.filter((m) => m.matchStatus === "Completed" || m.matchStatus === "Cancelled").length;
    return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [prelimMatches, activeSeed]);

  const drawsFilters: FilterConfig[] = [
    { type: "year", value: String(year), years, onChange: (v) => setYear(Number(v)) },
    { type: "category", value: categoryId, options: categoryOptions, onChange: setCategoryId },
  ];
  if (!isElimination) {
    if (hasPrelim || hasKnockout) {
      drawsFilters.push({
        type: "round",
        value: isPrelim ? "prelim" : "knockout",
        options: roundFilterOptions,
        onChange: handleRoundFilterChange,
        desktopOnly: true,
      });
    }
  }
  const showSeedTabs = !isElimination && isPrelim && seedOptions.length > 0;

  return (
    <DatabaseLayout
      filters={drawsFilters}
      isEmpty={categoryOptions.length === 0}
      emptyText={t.emptyStates.noResults}
      contentClassName="pb-6 md:pb-8"
    >
      <div className="space-y-[var(--content-gap)] text-[var(--section-text)] md:space-y-[var(--section-gap)]">

        {showMobileStageNav && (
          <div className="md:hidden">
            <StageHeader
              title={stageTitle}
              subtitle={stageDateLabel || undefined}
              navigation={{
                onPrev: mobilePrevCode ? () => setStageCode(mobilePrevCode) : undefined,
                onNext: mobileNextCode ? () => setStageCode(mobileNextCode) : undefined,
                prevLabel: t.drawsPage.bracketPrevRound,
                nextLabel: t.drawsPage.bracketNextRound,
              }}
            />
          </div>
        )}

        {isElimination ? (
          knockoutRounds.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">{t.drawsPage.drawNoMatches}</p>
          ) : (
            <BracketView
              knockoutRounds={knockoutRounds}
              teamRankById={teamRankById}
              activeRoundCode={stageCode}
              locale={locale}
              roundDateRanges={roundDateRanges}
            />
          )
        ) : (
          <>
            {isPrelim && hasPrelim && (
              <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
                {showSeedTabs && (
                  <Tabs value={activeSeedTab} onValueChange={setSeedParam}>
                    <TabsList>
                      <TabsTrigger value="all">{t.drawsPage.prelims.allGroups}</TabsTrigger>
                      {seedOptions.map((s) => (
                        <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
                {prelimProgress.total > 0 && (
                  <div className="space-y-[var(--element-gap)]">
                    <h3 className="text-base font-semibold text-[var(--color-text-secondary)]">{t.drawsPage.prelims.progressHeading}</h3>
                    <div className="space-y-1.5 rounded-lg border border-[var(--color-border-ui)] bg-[var(--color-surface-card)] p-3">
                      <ProgressBar value={prelimProgress.pct} />
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                        <span>{t.drawsPage.prelims.matchesProgress(prelimProgress.completed, prelimProgress.total)}</span>
                        {!activeSeed && expectedAdvancingCount > 0 && <span>{t.drawsPage.prelims.advancingCount(teamRankById.size, expectedAdvancingCount)}</span>}
                      </div>
                    </div>
                  </div>
                )}
                {prelimProgress.total > 0 && leaderboardRows && leaderboardRows.length > 0 && (
                  <Divider />
                )}
                {leaderboardRows && leaderboardRows.length > 0 && (
                  <div className="space-y-[var(--element-gap)]">
                    <h3 className="text-base font-semibold text-[var(--color-text-secondary)]">{t.drawsPage.prelims.standingsHeading}</h3>
                    <Table
                      variant="data"
                      headers={[
                        t.drawsPage.prelims.tableRank,
                        t.drawsPage.prelims.tablePlayers,
                        t.drawsPage.prelims.tableWinPct,
                        t.drawsPage.prelims.tableWL,
                        t.drawsPage.prelims.tableSD,
                        t.drawsPage.prelims.tableGD,
                      ]}
                      dataRows={(() => {
                        const anyCompleted = leaderboardRows.some((r) => r.w > 0 || r.l > 0);
                        return leaderboardRows.map((r) => {
                          const p1 = locale === "ko" ? (r.player1Ko ?? r.player1) : r.player1;
                          const p2 = r.player2 ? (locale === "ko" ? (r.player2Ko ?? r.player2) : r.player2) : undefined;
                          const advancing = teamRankById.has(r.teamId);
                          const winPct = r.w + r.l > 0 ? `${Math.round((r.w / (r.w + r.l)) * 100)}%` : "—";
                          const names = (
                            <span className="flex items-center gap-1.5">
                              <span className="flex flex-col gap-0.5">
                                <span>{p1}</span>
                                {p2 && <span>{p2}</span>}
                              </span>
                              {advancing && (
                                <Chip
                                  label={<ArrowUp className="size-3" aria-hidden />}
                                  aria-label={t.matchUi.advancing}
                                  size="sm"
                                  shape="rounded"
                                  className="shrink-0 h-5 items-center justify-center team-status-advancing"
                                />
                              )}
                              {r.tied && (
                                <Chip
                                  label={t.drawsPage.prelims.tiedPendingDraw}
                                  size="sm"
                                  shape="rounded"
                                  className="shrink-0 h-5 items-center justify-center team-status-tied"
                                />
                              )}
                              {r.withdrawn && (
                                <Chip
                                  label={t.matchUi.withdrew}
                                  size="sm"
                                  shape="rounded"
                                  className="shrink-0 h-5 items-center justify-center player-status-withdrew"
                                />
                              )}
                            </span>
                          );
                          return [
                            anyCompleted ? r.rank : "",
                            <Fragment key={r.teamId}>{names}</Fragment>,
                            winPct, `${r.w}-${r.l}`, r.sd, r.gd,
                          ];
                        });
                      })()}
                      columnNoWrap={[true, true, true, true, true, true]}
                    />
                    {locale !== "ko" && (
                      <ul className="grid grid-cols-2 items-start gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)] md:flex md:flex-row md:flex-wrap md:items-center">
                        {[
                          `${t.drawsPage.prelims.tableWinPct} - Win percentage`,
                          `${t.drawsPage.prelims.tableWL} - Wins-Losses`,
                          `${t.drawsPage.prelims.tableSD} - Set difference`,
                          `${t.drawsPage.prelims.tableGD} - Game difference`,
                        ].map((item) => (
                          <li key={item} className="flex items-center text-xs before:mr-2 before:content-['•']">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {(prelimProgress.total > 0 || (leaderboardRows && leaderboardRows.length > 0)) && (
                  <Divider />
                )}
                <div className="space-y-[var(--element-gap)]">
                  <h3 className="text-base font-semibold text-[var(--color-text-secondary)]">{t.drawsPage.tabs.Matches}</h3>
                  {prelimMatchesFiltered.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-tertiary)]">{t.drawsPage.prelims.noPrelimsMatches}</p>
                  ) : (
                    <ul className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
                      {prelimMatchesFiltered.map((match) => (
                        <li key={match.id}>
                          <MatchCard
                            match={match}
                            omitCategoryInHeader
                            team1GlobalRank={match.team1Id ? (rankMap.get(match.team1Id) ?? null) : null}
                            team2GlobalRank={match.team2Id ? (rankMap.get(match.team2Id) ?? null) : null}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {!isPrelim && (
              knockoutRounds.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{t.drawsPage.drawNoMatches}</p>
              ) : (
                <BracketView
                  knockoutRounds={knockoutRounds}
                  teamRankById={teamRankById}
                  activeRoundCode={stageCode}
                  locale={locale}
                  roundDateRanges={roundDateRanges}
                />
              )
            )}
          </>
        )}

      </div>
    </DatabaseLayout>
  );
}
