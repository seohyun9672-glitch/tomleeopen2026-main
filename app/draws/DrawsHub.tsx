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
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";
import type { Match } from "@/lib/matches";
import { isCancelledMatch, isoDateLocal } from "@/lib/matches";
import { ROUND_PRE, ROUND_F } from "@/lib/round";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout, type FilterConfig } from "@/app/components/database";
import { StageHeader } from "@/app/components/tree/StageHeader";
import { MatchCard } from "@/app/components/MatchCard";
import { Table } from "@/app/components/ui/table/Table";

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
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildAvailableRounds(matches: Match[]): RoundInfo[] {
  const map = new Map<string, RoundInfo>();
  for (const m of matches) {
    const r = m.round;
    if (r && !map.has(r.code)) map.set(r.code, { code: r.code, labelEn: r.labelEn, labelKo: r.labelKo, sortOrder: r.sortOrder });
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function computeDefaultStageCode(
  availableRounds: RoundInfo[],
  matches: Match[],
  today: string,
): string {
  let latest: string | null = null;
  for (const { code } of availableRounds) {
    const hasStarted = matches.some((m) => m.round?.code === code && m.date != null && m.date <= today);
    if (hasStarted) latest = code;
  }
  return latest ?? availableRounds[0]?.code ?? ROUND_PRE;
}

// ─── Prelim stats ──────────────────────────────────────────────────────────────

type PrelimTeamStats = { w: number; l: number; sd: number; gd: number };

function computePrelimStats(matches: Match[]): Map<string, PrelimTeamStats> {
  const prelims = matches.filter((m) => m.round?.code === ROUND_PRE);
  const stats = new Map<string, PrelimTeamStats>();
  const ensure = (id: string | null) => { if (id && !stats.has(id)) stats.set(id, { w: 0, l: 0, sd: 0, gd: 0 }); };

  for (const m of prelims) {
    ensure(m.team1Id); ensure(m.team2Id);
    if (isCancelledMatch(m.matchStatus)) {
      const t1 = m.team1Id ? stats.get(m.team1Id) : null;
      const t2 = m.team2Id ? stats.get(m.team2Id) : null;
      if (t1) { t1.l += 1; t1.sd -= 2; t1.gd -= 12; }
      if (t2) { t2.l += 1; t2.sd -= 2; t2.gd -= 12; }
      continue;
    }
    if (m.winner == null || !m.team1Id || !m.team2Id) continue;
    const t1 = stats.get(m.team1Id)!; const t2 = stats.get(m.team2Id)!;
    if (m.winner === 1) { t1.w += 1; t2.l += 1; } else { t2.w += 1; t1.l += 1; }
    for (const [a, b] of [
      [m.set1ScoreTeam1, m.set1ScoreTeam2],
      [m.set2ScoreTeam1, m.set2ScoreTeam2],
      [m.set3ScoreTeam1, m.set3ScoreTeam2],
    ] as Array<[string | null, string | null]>) {
      const n1 = a != null ? parseInt(a, 10) : NaN; const n2 = b != null ? parseInt(b, 10) : NaN;
      if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
      t1.gd += n1 - n2; t2.gd += n2 - n1;
      if (n1 > n2) { t1.sd += 1; t2.sd -= 1; } else if (n2 > n1) { t2.sd += 1; t1.sd -= 1; }
    }
  }
  return stats;
}

function buildPrelimRankMap(matches: Match[]): Map<string, number> {
  const stats = computePrelimStats(matches);
  if (stats.size === 0) return new Map();
  const sorted = [...stats.keys()].sort((a, b) => {
    const sa = stats.get(a)!; const sb = stats.get(b)!;
    return sb.w !== sa.w ? sb.w - sa.w : sb.sd !== sa.sd ? sb.sd - sa.sd : sb.gd - sa.gd;
  });
  const out = new Map<string, number>();
  sorted.forEach((id, i) => out.set(id, i + 1));
  return out;
}

// ─── Prelim leaderboard ────────────────────────────────────────────────────────

type LeaderboardRow = {
  rank: number; group: string;
  player1: string; player2?: string; player1Ko?: string; player2Ko?: string;
  w: number; l: number; sd: number; gd: number; teamId: string;
};

type DisplayInfo = { group: string; player1: string; player2?: string; player1Ko?: string; player2Ko?: string };

function buildDisplayMap(prelims: Match[]): Map<string, DisplayInfo> {
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
          group: (groupCode ?? "—").trim() || "—",
          player1: names[0] ?? "—", player2: names[1],
          player1Ko: namesKo[0], player2Ko: namesKo[1],
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

function buildLeaderboard(categoryMatches: Match[]): LeaderboardRow[] | null {
  const prelims = categoryMatches.filter((m) => m.round?.code === ROUND_PRE);
  if (prelims.length === 0) return null;
  const statsMap = computePrelimStats(categoryMatches);
  if (statsMap.size < 2) return null;
  const displayMap = buildDisplayMap(prelims);
  const allRows = [...statsMap.keys()]
    .filter((id) => displayMap.has(id))
    .map((teamId) => ({ teamId, rank: 0, ...displayMap.get(teamId)!, ...statsMap.get(teamId)! }));
  if (allRows.length < 2) return null;
  const sorted = [...allRows].sort((a, b) =>
    b.w !== a.w ? b.w - a.w
    : b.sd !== a.sd ? b.sd - a.sd
    : b.gd !== a.gd ? b.gd - a.gd
    : a.group.localeCompare(b.group) || a.player1.localeCompare(b.player1)
  );
  let currentRank = 0; let prev: { w: number; sd: number; gd: number } | null = null;
  return sorted.map((row, i) => {
    if (!prev || row.w !== prev.w || row.sd !== prev.sd || row.gd !== prev.gd) {
      currentRank = i + 1; prev = { w: row.w, sd: row.sd, gd: row.gd };
    }
    return { ...row, rank: currentRank };
  });
}

// ─── Group match sorting ───────────────────────────────────────────────────────

function groupTuple(code: string | null | undefined): [string, number] {
  const v = (code ?? "").trim();
  const an = /^([A-Za-z])(\d+)$/.exec(v);
  if (an) return [an[1]!.toUpperCase(), parseInt(an[2]!, 10)];
  const num = /^(\d+)$/.exec(v);
  if (num) return ["￿", parseInt(num[1]!, 10)];
  const alpha = /^([A-Za-z])/.exec(v);
  return [alpha ? alpha[1]!.toUpperCase() : "￿", 9999];
}

function cmpGroups(a: [string, number], b: [string, number]): number {
  return a[0] !== b[0] ? a[0].localeCompare(b[0]) : a[1] - b[1];
}

function sortGroupMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const t1a = groupTuple(a.team1Seed); const t2a = groupTuple(a.team2Seed);
    const t1b = groupTuple(b.team1Seed); const t2b = groupTuple(b.team2Seed);
    const [aLow, aHigh] = cmpGroups(t1a, t2a) <= 0 ? [t1a, t2a] : [t2a, t1a];
    const [bLow, bHigh] = cmpGroups(t1b, t2b) <= 0 ? [t1b, t2b] : [t2b, t1b];
    return cmpGroups(aLow, bLow) || cmpGroups(aHigh, bHigh)
      || (a.matchNumber ?? 0) - (b.matchNumber ?? 0)
      || (/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? "") ? a.date! : "0000")
          .localeCompare(/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "") ? b.date! : "0000")
      || (a.time ?? "").localeCompare(b.time ?? "")
      || a.id.localeCompare(b.id);
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
  rankMap: Map<string, number>
): number | null {
  if (!teamId) return null;
  return rankMap.get(teamId) ?? null;
}


type RoundGeom = { centers: number[]; height: number };

function sortByMatchNumber(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0) || a.id.localeCompare(b.id));
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
              team1Rank={resolveBracketTeamDisplayRank(m.team1Id, teamRankById)}
              team2Rank={resolveBracketTeamDisplayRank(m.team2Id, teamRankById)}
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
            team1Rank={resolveBracketTeamDisplayRank(m.team1Id, teamRankById)}
            team2Rank={resolveBracketTeamDisplayRank(m.team2Id, teamRankById)}
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
};

function BracketView({ knockoutRounds, teamRankById, activeRoundCode, locale }: BracketViewProps) {
  const sortedRounds = useMemo(
    () => knockoutRounds.map((r) => ({ ...r, matches: sortByMatchNumber(r.matches) })),
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
  const mobileMatches = mobileRound ? sortByMatchNumber(mobileRound.matches) : null;

  const renderCol = (r: KnockoutRound & { matches: Match[] }) => (
    <div className={`flex flex-col self-start ${colClass}`}>
      <StageHeader title={roundLabel(r, locale)} />
      <div className="pt-4 md:pt-5">
        <BracketAlignedColumn matches={r.matches} geom={geoms.get(r.code)} teamRankById={teamRankById} />
      </div>
    </div>
  );

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

type Props = { categories: CategoryRecord[]; allMatches: Match[] };

// ─── Hub state ────────────────────────────────────────────────────────────────

function useDrawsState({ categories, allMatches }: Props) {
  const { locale } = useLocale();
  const today = isoDateLocal();

  const years = useMemo(
    () => [...new Set(allMatches.map((m) => m.tournamentYear))].sort((a, b) => b - a),
    [allMatches],
  );
  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const year = yearParamNum > 0 && years.includes(yearParamNum) ? yearParamNum : (years[0] ?? new Date().getFullYear());
  const setYear = useCallback((y: number) => setYearParam(String(y), { clear: ["stage", "group"] }), [setYearParam]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);
  const categoriesToShow = useMemo(
    () => categories.filter((c) => allMatches.some((m) => m.tournamentYear === year && m.categoryId === c.id)),
    [categories, year, allMatches],
  );
  const [rawCatParam, setCatParam] = useUrlParam("cat");
  const categoryId = categoriesToShow.some((c) => c.id === rawCatParam) ? rawCatParam : (categoriesToShow[0]?.id ?? "");
  const setCategoryId = useCallback((id: string) => setCatParam(id), [setCatParam]);
  const categoryOptions = useMemo(
    () => categoriesToShow.map((c) => ({ id: c.id, label: categoryLabelForId(categoriesById, c.id, locale) })),
    [categoriesToShow, categoriesById, locale],
  );

  const categoryMatches = useMemo(
    () => allMatches.filter((m) => m.tournamentYear === year && m.categoryId === categoryId),
    [allMatches, year, categoryId],
  );

  // Rounds derived entirely from Prisma match data
  const availableRounds = useMemo(() => buildAvailableRounds(categoryMatches), [categoryMatches]);
  const prelimMatches = useMemo(
    () => categoryMatches.filter((m) => m.round?.code === ROUND_PRE),
    [categoryMatches],
  );
  const knockoutRounds = useMemo(() => buildKnockoutRounds(categoryMatches), [categoryMatches]);

  const hasPrelim = prelimMatches.length > 0;
  const hasKnockout = knockoutRounds.length > 0;

  const defaultStageCode = useMemo(
    () => computeDefaultStageCode(availableRounds, categoryMatches, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableRounds, categoryMatches],
  );

  const [stageParam, setStageParam] = useUrlParam("stage");
  const stageCode: string = useMemo(() => {
    const isValid = availableRounds.some((r) => r.code === stageParam);
    const resolved = isValid ? stageParam! : defaultStageCode;
    if (isPrelimRound(resolved) && !hasPrelim) {
      return knockoutRounds[knockoutRounds.length - 1]?.code ?? resolved;
    }
    return resolved;
  }, [stageParam, defaultStageCode, availableRounds, hasPrelim, knockoutRounds]);

  const setStageCode = useCallback(
    (code: string) => setStageParam(code, { clear: ["group"] }),
    [setStageParam],
  );

  useLayoutEffect(() => {
    const isValid = availableRounds.some((r) => r.code === stageParam);
    if (!isValid || (isPrelimRound(stageParam ?? "") && !hasPrelim)) {
      setStageParam(defaultStageCode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Group filter — reads team1Seed/team2Seed which store the prelim group letter (A, B, C…)
  const [rawGroupParam, setGroupParam] = useUrlParam("group");
  const groupOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const m of prelimMatches) {
      if (m.team1Seed?.trim()) seen.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) seen.add(m.team2Seed.trim());
    }
    return [...seen].sort();
  }, [prelimMatches]);
  const activeGroup = groupOptions.includes(rawGroupParam ?? "") ? (rawGroupParam ?? "") : (groupOptions[0] ?? "");

  const teamRankById = useMemo(() => buildPrelimRankMap(categoryMatches), [categoryMatches]);

  // Mobile round navigation — all rounds in sortOrder
  const orderedRoundCodes = useMemo(() => availableRounds.map((r) => r.code), [availableRounds]);
  const navIndex = orderedRoundCodes.indexOf(stageCode);
  const mobilePrevCode = navIndex > 0 ? orderedRoundCodes[navIndex - 1] : null;
  const mobileNextCode = navIndex >= 0 && navIndex < orderedRoundCodes.length - 1 ? orderedRoundCodes[navIndex + 1] : null;

  return {
    year, setYear, years,
    categoryId, setCategoryId, categoryOptions,
    stageCode, setStageCode,
    availableRounds,
    prelimMatches, knockoutRounds,
    hasPrelim, hasKnockout,
    activeGroup, setGroupParam, groupOptions,
    teamRankById,
    orderedRoundCodes, mobilePrevCode, mobileNextCode,
    categoryMatches, today,
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
    prelimMatches, knockoutRounds,
    hasPrelim, hasKnockout,
    activeGroup, setGroupParam, groupOptions,
    teamRankById,
    orderedRoundCodes, mobilePrevCode, mobileNextCode,
    categoryMatches, today,
  } = useDrawsState(props);

  const isPrelim = isPrelimRound(stageCode);
  const showMobileStageNav = orderedRoundCodes.length > 1;

  // Stage title for mobile — from match round data
  const stageTitle = useMemo(() => {
    const r = availableRounds.find((r) => r.code === stageCode);
    return r ? roundLabel(r, locale) : "";
  }, [availableRounds, stageCode, locale]);

  // Desktop round filter: "Preliminary" | "Finals" — only shown if both exist
  const roundFilterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (hasPrelim) {
      const pr = availableRounds.find((r) => isPrelimRound(r.code));
      opts.push({ value: "prelim", label: pr ? roundLabel(pr, locale) : t.drawsPage.prelims.prelimsMatches });
    }
    if (hasKnockout) {
      opts.push({ value: "knockout", label: t.drawsPage.drawStageFinalsBracket });
    }
    return opts;
  }, [hasPrelim, hasKnockout, availableRounds, locale, t.drawsPage.drawStageFinalsBracket, t.drawsPage.prelims.prelimsMatches]);

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

  // Prelim leaderboard
  const allLeaderboardRows = useMemo(() => buildLeaderboard(categoryMatches), [categoryMatches]);
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    (allLeaderboardRows ?? []).forEach((r) => map.set(r.teamId, r.rank));
    return map;
  }, [allLeaderboardRows]);
  const leaderboardRows = useMemo(() => {
    if (!allLeaderboardRows) return null;
    const filtered = activeGroup
      ? allLeaderboardRows.filter((r) => r.group === activeGroup)
      : allLeaderboardRows;
    let rank = 0; let prev: { w: number; sd: number; gd: number } | null = null;
    return filtered.map((r, i) => {
      if (!prev || r.w !== prev.w || r.sd !== prev.sd || r.gd !== prev.gd) {
        rank = i + 1; prev = { w: r.w, sd: r.sd, gd: r.gd };
      }
      return { ...r, rank };
    });
  }, [allLeaderboardRows, activeGroup]);

  const prelimMatchesFiltered = useMemo(() => {
    const filtered = activeGroup
      ? prelimMatches.filter((m) => m.team1Seed?.trim() === activeGroup || m.team2Seed?.trim() === activeGroup)
      : prelimMatches;
    return sortGroupMatches(filtered);
  }, [prelimMatches, activeGroup]);

  const drawsFilters: FilterConfig[] = [
    { type: "year", value: String(year), years, onChange: (v) => setYear(Number(v)) },
    { type: "category", value: categoryId, options: categoryOptions, onChange: setCategoryId },
  ];
  if (hasPrelim || hasKnockout) {
    drawsFilters.push({
      type: "round",
      value: isPrelim ? "prelim" : "knockout",
      options: roundFilterOptions,
      onChange: handleRoundFilterChange,
      desktopOnly: true,
    });
  }
  if (isPrelim && groupOptions.length > 0) {
    drawsFilters.push({
      type: "group",
      value: activeGroup,
      options: groupOptions,
      onChange: setGroupParam,
    });
  }

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
              navigation={{
                onPrev: () => { if (mobilePrevCode) setStageCode(mobilePrevCode); },
                onNext: () => { if (mobileNextCode) setStageCode(mobileNextCode); },
                prevDisabled: mobilePrevCode == null,
                nextDisabled: mobileNextCode == null,
                prevLabel: t.drawsPage.bracketPrevRound,
                nextLabel: t.drawsPage.bracketNextRound,
              }}
            />
          </div>
        )}

        {isPrelim && hasPrelim && (
          <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
            {leaderboardRows && leaderboardRows.length > 0 && (
              <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
                <Table
                  variant="data"
                  headers={[
                    t.drawsPage.prelims.tableRank,
                    t.drawsPage.prelims.tablePlayers,
                    t.drawsPage.prelims.tableW,
                    t.drawsPage.prelims.tableL,
                    t.drawsPage.prelims.tableSD,
                    t.drawsPage.prelims.tableGD,
                  ]}
                  dataRows={leaderboardRows.map((r) => {
                    const p1 = locale === "ko" ? (r.player1Ko ?? r.player1) : r.player1;
                    const p2 = r.player2 ? (locale === "ko" ? (r.player2Ko ?? r.player2) : r.player2) : undefined;
                    return [
                      r.rank,
                      p2 ? <span key={r.teamId} className="flex flex-col gap-0.5"><span>{p1}</span><span>{p2}</span></span> : p1,
                      r.w, r.l, r.sd, r.gd,
                    ];
                  })}
                  columnNoWrap={[true, true, true, true, true, true]}
                />
                {locale !== "ko" && (
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]">
                    {[
                      `${t.drawsPage.prelims.tableW} - Wins`,
                      `${t.drawsPage.prelims.tableL} - Losses`,
                      `${t.drawsPage.prelims.tableSD} - Set difference`,
                      `${t.drawsPage.prelims.tableGD} - Game difference`,
                    ].map((item) => (
                      <li key={item} className="flex items-center before:mr-2 before:content-['•']">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
              {prelimMatchesFiltered.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{t.drawsPage.prelims.noPrelimsMatches}</p>
              ) : (
                <ul className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
                  {prelimMatchesFiltered.map((match) => (
                    <li key={match.id}>
                      <MatchCard
                        match={match}
                        omitCategoryInHeader
                        team1Rank={match.team1Id ? (rankMap.get(match.team1Id) ?? null) : null}
                        team2Rank={match.team2Id ? (rankMap.get(match.team2Id) ?? null) : null}
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
            />
          )
        )}

      </div>
    </DatabaseLayout>
  );
}
