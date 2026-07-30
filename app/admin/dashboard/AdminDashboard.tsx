"use client";

import { useMemo, useState } from "react";
import * as Recharts from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent, widestLabelWidth, measureTextWidth, type ChartConfig } from "@/app/components/ui/Chart";
import { deriveYearOptions } from "@/app/components/database/Filters";
import { Select } from "@/app/components/ui/Select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { categoryLabelForId, buildCategoryByIdMap, categoryChipColorVar, type CategoryRecord } from "@/lib/categories";
import { clubChipColorVar } from "@/lib/clubs";
import { registrationStatusLabel, REGISTRATION_STATUSES } from "@/lib/registration";
import { useLocale } from "@/lib/locale-context";
import { getYear, getToday } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/matches";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { MatchRow, TeamRow, RegistrationRow } from "@/app/admin/AdminHub";

// Series colors cycle through the app's existing pastel palette (globals.css) —
// there are no --chart-N tokens in this app, so chart series reuse this palette.
const PASTEL_SERIES = [
  "--pastel-sky-fg", "--pastel-mint-fg", "--pastel-rose-fg", "--pastel-butter-fg",
  "--pastel-lilac-fg", "--pastel-peach-fg", "--pastel-aqua-fg", "--pastel-pink-fg",
  "--pastel-periwinkle-fg", "--pastel-neutral-fg",
];
function seriesColor(i: number): string {
  return `var(${PASTEL_SERIES[i % PASTEL_SERIES.length]})`;
}

function isCompletedStatus(status: string): boolean {
  return status.trim().toLowerCase() === "completed";
}
function isCancelledStatus(status: string): boolean {
  return /^cancell?ed$/i.test(status.trim());
}
/** A match is "done" (no longer pending/scheduled) once it's Completed *or*
 * Cancelled — both are terminal states for completion-rate purposes. */
function isDoneStatus(status: string): boolean {
  return isCompletedStatus(status) || isCancelledStatus(status);
}

const PRELIM_KEY = "PRELIM";

type RoundBucket = { key: string; label: string; sortOrder: number };

/** Groups a year's matches into round buckets — PRE and R16 merge into one
 * "Prelim" bucket (round of 16 is considered prelim for this dashboard), every
 * other round keeps its own bucket. A bucket only exists if it has matches. */
function useRoundBuckets(matches: MatchRow[], year: number, locale: "en" | "ko", prelimLabel: string): RoundBucket[] {
  return useMemo(() => {
    const byKey = new Map<string, RoundBucket>();
    for (const m of matches) {
      if (m.tournamentYear !== year || !m.roundCode) continue;
      const isPrelim = m.roundCode === "PRE" || m.roundCode === "R16";
      const key = isPrelim ? PRELIM_KEY : m.roundCode;
      const label = isPrelim ? prelimLabel : (locale === "ko" ? m.roundLabelKo : m.roundLabel) ?? m.roundCode;
      const sortOrder = m.roundSortOrder ?? 99;
      const existing = byKey.get(key);
      if (!existing) byKey.set(key, { key, label, sortOrder });
      else if (sortOrder < existing.sortOrder) existing.sortOrder = sortOrder;
    }
    return [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [matches, year, locale, prelimLabel]);
}

function matchesForBucket(matches: MatchRow[], year: number, bucketKey: string): MatchRow[] {
  return matches.filter((m) => {
    if (m.tournamentYear !== year) return false;
    if (bucketKey === PRELIM_KEY) return m.roundCode === "PRE" || m.roundCode === "R16";
    return m.roundCode === bucketKey;
  });
}

function WidgetCard({ title, caption, corner, className, children }: { title: string; caption?: string; corner?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] p-4 shadow-sm ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-h3 m-0">{title}</h3>
          {caption && <span className="text-xs text-[var(--color-text-tertiary)]">{caption}</span>}
        </div>
        {corner && <span className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">{corner}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-text-tertiary)]">
      {label}
    </div>
  );
}

// ─── Widget: match completion rate by round ────────────────────────────────────

function CompletionByRoundWidget({ matches, buckets, year, noDataLabel }: { matches: MatchRow[]; buckets: RoundBucket[]; year: number; noDataLabel: string }) {
  const data = useMemo(() => buckets.map((b) => {
    const inBucket = matchesForBucket(matches, year, b.key);
    const done = inBucket.filter((m) => isDoneStatus(m.matchStatus)).length;
    const total = inBucket.length;
    return { round: b.label, rate: total ? Math.round((done / total) * 100) : 0, done, total };
  }), [matches, buckets, year]);

  const config: ChartConfig = { rate: { label: "% completed", color: seriesColor(0) } };

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <Recharts.BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <Recharts.CartesianGrid vertical={false} />
        <Recharts.XAxis dataKey="round" tickLine={false} axisLine={false} />
        <Recharts.YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
        <Recharts.Bar dataKey="rate" fill="var(--color-rate)" radius={4}>
          <Recharts.LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} />
          <Recharts.LabelList
            dataKey="rate"
            content={(props: { x?: number; y?: number; width?: number; index?: number }) => {
              const { x, y, width, index } = props;
              const row = index != null ? data[index] : undefined;
              if (!row || x == null || y == null || width == null) return null;
              return (
                <text x={x + width / 2} y={y + 16} textAnchor="middle" fontSize={10} fill="var(--color-surface-card)">
                  {row.done}/{row.total}
                </text>
              );
            }}
          />
        </Recharts.Bar>
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── Widget: match completion rate per date (cumulative trend) ────────────────

function CompletionByDateWidget({ matches, year, locale, noDataLabel }: { matches: MatchRow[]; year: number; locale: "en" | "ko"; noDataLabel: string }) {
  const data = useMemo(() => {
    // Denominator = every match for the year, not just the ones with a date —
    // plenty of matches (e.g. self-reported prelim round-robin) are marked
    // done without ever getting a calendar date, and they're still part of
    // "how many of this year's matches are done."
    const yearMatches = matches.filter((m) => m.tournamentYear === year);
    const total = yearMatches.length;
    if (total === 0) return [];
    const isCurrentYear = year === getYear();
    const today = getToday();
    // The trend's x-axis is only built from matches that DO have a date. For
    // the current tournament year it runs through today (not into future
    // scheduled dates), always ending on "today". For a past year, just use
    // that year's actual match dates.
    const dates = [...new Set(
      yearMatches.filter((m) => m.date && (!isCurrentYear || m.date <= today)).map((m) => m.date!),
    )].sort();
    if (isCurrentYear && dates[dates.length - 1] !== today) dates.push(today);
    if (dates.length === 0) return [];
    return dates.map((date) => {
      // A dated match counts once its date is reached; an undated match has
      // no date to gate it, so if it's done, it counts from the start.
      const doneSoFar = yearMatches.filter((m) => isDoneStatus(m.matchStatus) && (!m.date || m.date <= date)).length;
      return { date: formatDateDisplay(date, locale), rate: Math.round((doneSoFar / total) * 100) };
    });
  }, [matches, year, locale]);

  const config: ChartConfig = { rate: { label: "% completed", color: seriesColor(2) } };

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <Recharts.LineChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
        <Recharts.CartesianGrid vertical={false} />
        <Recharts.XAxis dataKey="date" tickLine={false} axisLine={false} />
        <Recharts.YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
        <Recharts.Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={{ fill: "var(--color-rate)" }}>
          <Recharts.LabelList
            dataKey="rate"
            content={(props: { x?: number; y?: number; value?: number; index?: number }) => {
              if (props.index !== data.length - 1 || props.x == null || props.y == null) return null;
              return (
                <text
                  x={props.x}
                  y={Math.max(12, props.y - 10)}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--color-rate)"
                >
                  {props.value}%
                </text>
              );
            }}
          />
        </Recharts.Line>
      </Recharts.LineChart>
    </ChartContainer>
  );
}

// ─── Shared pie/donut label: count rendered outside the slice ─────────────────
// White-on-pastel-fill text reads inconsistently across the palette (some
// slice colors are too light for white to have real contrast), so the label
// sits just past the slice on the chart's neutral background instead, in the
// theme's normal text color. Both the offset and font size scale off the
// *actual rendered* outerRadius (recharts passes in already-resolved pixels
// for the current container size) instead of fixed px constants, which would
// disproportionately eat the available margin on a small/narrow container.

const PIE_LABEL_RADIAN = Math.PI / 180;

type PieLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number;
  percent?: number;
};

const PIE_LABEL_RADIUS_FACTOR = 1.2;
const PIE_LABEL_LINE_END_FACTOR = 1.2; // stops short of the label so the line never touches the text

/** Positions a raw count label just outside the pie slice (no percentage). */
function renderPieCountLabel(props: PieLabelProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) return null;
  const radius = outerRadius * PIE_LABEL_RADIUS_FACTOR;
  const x = cx + radius * Math.cos(-midAngle * PIE_LABEL_RADIAN);
  const y = cy + radius * Math.sin(-midAngle * PIE_LABEL_RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12} fontWeight={600} fill="var(--color-text-primary)">
      {value}
    </text>
  );
}

/** Connector line matching `renderPieCountLabel`'s exact geometry, stopping
 * short of the label's start so the line and text never overlap. */
function renderPieLabelLine(props: PieLabelProps) {
  const { cx, cy, midAngle, outerRadius } = props;
  if (cx == null || cy == null || midAngle == null || outerRadius == null) return null;
  const cos = Math.cos(-midAngle * PIE_LABEL_RADIAN);
  const sin = Math.sin(-midAngle * PIE_LABEL_RADIAN);
  const startX = cx + outerRadius * cos;
  const startY = cy + outerRadius * sin;
  const endX = cx + outerRadius * PIE_LABEL_LINE_END_FACTOR * cos;
  const endY = cy + outerRadius * PIE_LABEL_LINE_END_FACTOR * sin;
  return <path d={`M${startX},${startY}L${endX},${endY}`} stroke="var(--color-border-ui-strong)" strokeWidth={1} fill="none" />;
}

// ─── Widget: registrations (single year, donut by status) ─────────────────────

// Fixed semantic colors instead of positional cycling, so "Pending" always
// reads as the palette's yellow tone regardless of REGISTRATION_STATUSES order.
const REGISTRATION_STATUS_COLOR_VARS: Record<string, string> = {
  Pending: "--pastel-butter-fg",
  Confirmed: "--pastel-mint-fg",
  Cancelled: "--pastel-rose-fg",
};
function registrationStatusColor(status: string): string {
  return `var(${REGISTRATION_STATUS_COLOR_VARS[status] ?? "--pastel-neutral-fg"})`;
}

function RegistrationsWidget({ registrations, year, locale, noDataLabel }: { registrations: RegistrationRow[]; year: number; locale: "en" | "ko"; noDataLabel: string }) {
  const data = useMemo(() => {
    const yearRegs = registrations.filter((r) => r.tournamentYear === year);
    return REGISTRATION_STATUSES
      .map((status) => ({
        status,
        label: registrationStatusLabel(status, locale),
        count: yearRegs.filter((r) => r.status === status).length,
        color: registrationStatusColor(status),
      }))
      .filter((row) => row.count > 0);
  }, [registrations, year, locale]);
  const total = data.reduce((sum, row) => sum + row.count, 0);

  const config: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    REGISTRATION_STATUSES.forEach((status) => { cfg[status] = { label: registrationStatusLabel(status, locale), color: registrationStatusColor(status) }; });
    return cfg;
  }, [locale]);

  if (total === 0) return <EmptyChart label={noDataLabel} />;

  // The legend is rendered as a plain flex row below the pie (not a recharts
  // <Legend> inside the chart area) so the pie's own box stays exactly square
  // and the total overlay can sit at a plain inset-0 center with no manual
  // offset to dodge legend space underneath it. It's outside <ChartContainer>
  // (which is what supplies chart context), so it can't reuse
  // ChartLegendContent — this mirrors that component's markup directly instead.

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-[220px]">
        <ChartContainer config={config} className="h-full w-full">
          <Recharts.PieChart>
            <Recharts.Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={2} label={renderPieCountLabel} labelLine={renderPieLabelLine} isAnimationActive={false}>
              {data.map((row) => (
                <Recharts.Cell key={row.status} fill={row.color} />
              ))}
            </Recharts.Pie>
          </Recharts.PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl md:text-2xl">{total}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {data.map((row) => (
          <div key={row.status} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: row.color }} />
            <span className="text-xs text-[var(--color-text-secondary)]">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Club win totals (shared by the "this year" and "all time" club widgets) ──

/** 1 = team1 won, 2 = team2 won, null = not yet decided (or tied/unscored). */
function computeMatchWinnerSide(m: MatchRow): 1 | 2 | null {
  let team1Sets = 0, team2Sets = 0;
  for (const [a, b] of [[m.set1T1, m.set1T2], [m.set2T1, m.set2T2], [m.set3T1, m.set3T2]] as const) {
    const na = a != null ? parseInt(a, 10) : NaN;
    const nb = b != null ? parseInt(b, 10) : NaN;
    if (Number.isNaN(na) || Number.isNaN(nb)) continue;
    if (na > nb) team1Sets++; else if (nb > na) team2Sets++;
  }
  if (team1Sets > team2Sets) return 1;
  if (team2Sets > team1Sets) return 2;
  return null;
}

function computeMatchWinnerClubs(m: MatchRow): string[] {
  const side = computeMatchWinnerSide(m);
  if (side === 1) return m.team1Clubs;
  if (side === 2) return m.team2Clubs;
  return [];
}

/** Returns clubs ranked by win count, descending — the bar-chart rule
 * throughout this dashboard is "highest value first", so callers can render
 * this order directly without re-sorting. */
function clubTotalsFor(matches: MatchRow[]): { club: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const m of matches) {
    for (const club of computeMatchWinnerClubs(m)) totals.set(club, (totals.get(club) ?? 0) + 1);
  }
  // Display the club's actual code from the Club table as stored (e.g. "LA",
  // "HA", "CTC") — no case transformation; clubChipColorVar normalizes case
  // internally for the color lookup regardless.
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([club, count]) => ({ club, count }));
}

/** Participation (not wins) — ranked by confirmed registration count per
 * club, deduped per registration so a player belonging to multiple clubs
 * only counts once for each. Every club with any activity is included (no
 * top-N cap), so lower-volume clubs still show up instead of being sliced off. */
function clubParticipationTotalsFor(registrations: RegistrationRow[]): { club: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const r of registrations) {
    if (r.status !== "Confirmed") continue;
    // A registrant with no club on file still counts, under "N/A" — otherwise
    // they'd silently disappear from the ranking instead of showing up as
    // unaffiliated participation.
    const clubs = r.playerClubs.length > 0 ? new Set(r.playerClubs) : new Set(["N/A"]);
    for (const club of clubs) totals.set(club, (totals.get(club) ?? 0) + 1);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([club, count]) => ({ club, count }));
}

// ─── Club championship points (this year) ──────────────────────────────────
// 참가 1점 · 4강 진출 5점 · 준우승 20점 · 우승 50점 (선수 1인당) — additive:
// a champion's team also cleared the semifinal on the way there, so it earns
// participation + semifinal + champion, not just the champion tier alone.
// Attributed at the club level, same granularity as every other widget on
// this dashboard (`team1Clubs`/`team2Clubs` are already deduped per team, so
// two same-club doubles partners register one tier credit, not two).
const CLUB_CHAMPIONSHIP_POINTS = { participation: 1, semifinal: 5, runnerUp: 20, champion: 50 } as const;

type ClubChampionshipTier = "participation" | "semifinal" | "runnerUp" | "champion";
type ClubChampionshipRow = Record<ClubChampionshipTier, number> & { club: string; total: number };

const CLUB_CHAMPIONSHIP_TIER_COLOR_VARS: Record<ClubChampionshipTier, string> = {
  participation: "--pastel-lilac-fg",
  semifinal: "--pastel-mint-fg",
  runnerUp: "--pastel-butter-fg",
  champion: "--pastel-rose-fg",
};
function championshipTierColor(tier: ClubChampionshipTier): string {
  return `var(${CLUB_CHAMPIONSHIP_TIER_COLOR_VARS[tier]})`;
}

function clubChampionshipBreakdownFor(matches: MatchRow[], registrations: RegistrationRow[], year: number): ClubChampionshipRow[] {
  const teamClubs = new Map<string, string[]>();
  const teamSemifinal = new Set<string>();
  const teamRunnerUp = new Set<string>();
  const teamChampion = new Set<string>();
  const mark = (teamId: string | null, clubs: string[], into: Set<string>) => {
    if (!teamId) return;
    teamClubs.set(teamId, clubs);
    into.add(teamId);
  };

  for (const m of matches) {
    if (m.tournamentYear !== year) continue;
    if (m.roundCode === "SF") {
      mark(m.team1Id, m.team1Clubs, teamSemifinal);
      mark(m.team2Id, m.team2Clubs, teamSemifinal);
    } else if (m.roundCode === "F") {
      const side = computeMatchWinnerSide(m);
      if (side === 1) {
        mark(m.team1Id, m.team1Clubs, teamChampion);
        mark(m.team2Id, m.team2Clubs, teamRunnerUp);
      } else if (side === 2) {
        mark(m.team2Id, m.team2Clubs, teamChampion);
        mark(m.team1Id, m.team1Clubs, teamRunnerUp);
      }
    }
  }

  const rows = new Map<string, ClubChampionshipRow>();
  const ensure = (club: string) => {
    let row = rows.get(club);
    if (!row) {
      row = { club, participation: 0, semifinal: 0, runnerUp: 0, champion: 0, total: 0 };
      rows.set(club, row);
    }
    return row;
  };

  for (const teamId of teamSemifinal) {
    for (const club of teamClubs.get(teamId) ?? []) ensure(club).semifinal += CLUB_CHAMPIONSHIP_POINTS.semifinal;
  }
  for (const teamId of teamRunnerUp) {
    for (const club of teamClubs.get(teamId) ?? []) ensure(club).runnerUp += CLUB_CHAMPIONSHIP_POINTS.runnerUp;
  }
  for (const teamId of teamChampion) {
    for (const club of teamClubs.get(teamId) ?? []) ensure(club).champion += CLUB_CHAMPIONSHIP_POINTS.champion;
  }
  for (const { club, count } of clubParticipationTotalsFor(registrations.filter((r) => r.tournamentYear === year))) {
    ensure(club).participation += count * CLUB_CHAMPIONSHIP_POINTS.participation;
  }

  for (const row of rows.values()) row.total = row.participation + row.semifinal + row.runnerUp + row.champion;

  // Unaffiliated players (no club on file) aren't a real club to rank — drop
  // the "N/A" placeholder `clubParticipationTotalsFor` uses for them.
  return [...rows.values()].filter((r) => r.club !== "N/A").sort((a, b) => b.total - a.total);
}

function ClubRankedBarChart({ data, noDataLabel }: { data: { club: string; count: number; color: string }[]; noDataLabel: string }) {
  const config: ChartConfig = { count: { label: "Wins" } };
  if (data.length === 0) return <EmptyChart label={noDataLabel} />;
  const chartHeight = Math.max(200, data.length * 44);
  const yAxisWidth = Math.max(40, widestLabelWidth(data.map((r) => r.club)));
  // The largest bar's value label sits right at the plot's right edge — size
  // the margin to the widest value label so it's never clipped, instead of
  // a flat guess that only fits small numbers.
  const rightMargin = Math.max(16, widestLabelWidth(data.map((r) => String(r.count)), "12px sans-serif", 12));
  return (
    <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
      <Recharts.BarChart data={data} layout="vertical" margin={{ top: 8, right: rightMargin, left: 0, bottom: 8 }}>
        <Recharts.CartesianGrid horizontal={false} />
        <Recharts.XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <Recharts.YAxis dataKey="club" type="category" tickLine={false} axisLine={false} width={yAxisWidth} interval={0} />
        <Recharts.Bar dataKey="count" radius={4}>
          <Recharts.LabelList dataKey="count" position="right" />
          {data.map((row) => (
            <Recharts.Cell key={row.club} fill={row.color} />
          ))}
        </Recharts.Bar>
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── Widget: winning clubs (this year, with a round selector) ─────────────────

function WinningClubsWidget({ matches, buckets, year, allRoundsLabel, noDataLabel }: { matches: MatchRow[]; buckets: RoundBucket[]; year: number; allRoundsLabel: string; noDataLabel: string }) {
  const [roundKey, setRoundKey] = useState("all");
  const effectiveKey = roundKey === "all" || buckets.some((b) => b.key === roundKey) ? roundKey : "all";

  const data = useMemo(() => {
    const scoped = effectiveKey === "all" ? matches.filter((m) => m.tournamentYear === year) : matchesForBucket(matches, year, effectiveKey);
    return clubTotalsFor(scoped).map((row) => ({ club: row.club, count: row.count, color: clubChipColorVar(row.club) }));
  }, [matches, year, effectiveKey]);

  return (
    <div className="flex flex-col gap-3">
      <Select value={effectiveKey} onChange={(e) => setRoundKey(e.currentTarget.value)} className="form-control-button-match w-fit">
        <option value="all">{allRoundsLabel}</option>
        {buckets.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
      </Select>
      <ClubRankedBarChart data={data} noDataLabel={noDataLabel} />
    </div>
  );
}

// ─── Widget: club participation (this year, by confirmed registrations) ───────

function ClubParticipationWidget({ registrations, year, noDataLabel }: { registrations: RegistrationRow[]; year: number; noDataLabel: string }) {
  const data = useMemo(() => {
    const yearRegs = registrations.filter((r) => r.tournamentYear === year);
    return clubParticipationTotalsFor(yearRegs).map((row) => ({ club: row.club, count: row.count, color: clubChipColorVar(row.club) }));
  }, [registrations, year]);

  return <ClubRankedBarChart data={data} noDataLabel={noDataLabel} />;
}

// ─── Widget: club championship points (this year) ─────────────────────────────

function ClubChampionshipWidget({
  matches, registrations, year, noDataLabel, legend,
}: {
  matches: MatchRow[]; registrations: RegistrationRow[]; year: number; noDataLabel: string;
  legend: { participation: string; semifinal: string; runnerUp: string; champion: string };
}) {
  const data = useMemo(() => clubChampionshipBreakdownFor(matches, registrations, year), [matches, registrations, year]);

  const config: ChartConfig = {
    participation: { label: legend.participation, color: championshipTierColor("participation") },
    semifinal: { label: legend.semifinal, color: championshipTierColor("semifinal") },
    runnerUp: { label: legend.runnerUp, color: championshipTierColor("runnerUp") },
    champion: { label: legend.champion, color: championshipTierColor("champion") },
  };

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  const chartHeight = Math.max(200, data.length * 44 + 40);
  const yAxisWidth = Math.max(40, widestLabelWidth(data.map((r) => r.club)));
  // Reserve room for the grand-total label past the end of each stacked bar,
  // not just the last segment's own value.
  const rightMargin = Math.max(16, widestLabelWidth(data.map((r) => String(r.total)), "12px sans-serif", 12) + 8);

  // Fixed left-to-right / top-to-bottom order for both the stack and the
  // legend — participation, semifinal, runner-up, champion (ascending point
  // value). Recharts' own legend/tooltip payload order for a stacked
  // horizontal bar chart doesn't reliably match `<Bar>` render order, so both
  // reorder whatever payload recharts hands them before rendering it.
  const tierOrder: ClubChampionshipTier[] = ["participation", "semifinal", "runnerUp", "champion"];
  const tierRank = (key: unknown) => {
    const i = tierOrder.indexOf(String(key) as ClubChampionshipTier);
    return i === -1 ? tierOrder.length : i;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts'
  // own content-render prop types are too generic/function-unioned to model
  // precisely here; the actual shape is the plain object recharts always
  // passes at runtime.
  const renderLegend = (props: any) => {
    const payload = props.payload as { value?: string | number; dataKey?: string | number; color?: string }[] | undefined;
    const sorted = payload ? [...payload].map((p) => ({ ...p })).sort((a, b) => tierRank(a.dataKey ?? a.value) - tierRank(b.dataKey ?? b.value)) : undefined;
    return <ChartLegendContent className={props.className} payload={sorted} />;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see renderLegend above.
  const renderTooltip = (props: any) => {
    const payload = props.payload as { dataKey?: string | number; name?: string | number; value?: number | string; color?: string }[] | undefined;
    const sorted = payload ? [...payload].map((p) => ({ ...p })).sort((a, b) => tierRank(a.dataKey) - tierRank(b.dataKey)) : undefined;
    return <ChartTooltipContent active={props.active} label={props.label} payload={sorted} />;
  };

  // Positioned exactly like `ClubRankedBarChart`'s `<LabelList position="right">`
  // (right after the bar's end, vertically centered) — but anchored to the
  // `participation` segment instead of the stack's last segment, since every
  // club's semifinal/runner-up/champion figure can be 0 (e.g. early in the
  // tournament, before any SF/F has been played) and recharts doesn't render
  // a `LabelList` attached to a zero-width segment at all. Participation is
  // always ≥ 1, so its rect always renders; its own rect already gives the
  // pixels-per-point scale (it starts at the axis origin), so the full
  // stack's end is a simple linear extrapolation from that one segment.
  const renderTotalLabel = (props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
    const { x, y, width, height, index } = props;
    const row = index != null ? data[index] : undefined;
    if (!row || x == null || y == null || width == null || height == null || row.participation <= 0) return null;
    const pxPerPoint = width / row.participation;
    return (
      <text x={x + row.total * pxPerPoint + 6} y={y + height / 2} dominantBaseline="central" fontSize={12} fill="var(--color-text-primary)">
        {row.total}
      </text>
    );
  };

  return (
    <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
      <Recharts.BarChart data={data} layout="vertical" margin={{ top: 8, right: rightMargin, left: 0, bottom: 8 }}>
        <Recharts.CartesianGrid horizontal={false} />
        <Recharts.XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <Recharts.YAxis dataKey="club" type="category" tickLine={false} axisLine={false} width={yAxisWidth} interval={0} />
        <Recharts.Legend content={renderLegend} verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 20 }} />
        <ChartTooltip content={renderTooltip} cursor={{ fill: "var(--color-surface-muted)" }} />
        <Recharts.Bar dataKey="participation" name={legend.participation} stackId="pts" fill={championshipTierColor("participation")} radius={4} isAnimationActive={false}>
          <Recharts.LabelList content={renderTotalLabel} />
        </Recharts.Bar>
        <Recharts.Bar dataKey="semifinal" name={legend.semifinal} stackId="pts" fill={championshipTierColor("semifinal")} radius={4} isAnimationActive={false} />
        <Recharts.Bar dataKey="runnerUp" name={legend.runnerUp} stackId="pts" fill={championshipTierColor("runnerUp")} radius={4} isAnimationActive={false} />
        <Recharts.Bar dataKey="champion" name={legend.champion} stackId="pts" fill={championshipTierColor("champion")} radius={4} isAnimationActive={false} />
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── Widget: club participation by year (all time, one line per club) ─────────

function ClubParticipationHistoryWidget({ registrations, noDataLabel }: { registrations: RegistrationRow[]; noDataLabel: string }) {
  const years = useMemo(() => deriveYearOptions(registrations.map((r) => r.tournamentYear)).sort((a, b) => a - b), [registrations]);

  const { data, clubs, config } = useMemo(() => {
    const allTimeTotals = clubParticipationTotalsFor(registrations);
    const topClubs = allTimeTotals.map((row) => row.club);

    const cfg: ChartConfig = {};
    topClubs.forEach((club) => { cfg[club] = { label: club, color: clubChipColorVar(club) }; });

    const rows = years.map((year) => {
      const yearTotals = clubParticipationTotalsFor(registrations.filter((r) => r.tournamentYear === year));
      const row: Record<string, string | number> = { year: String(year) };
      for (const club of topClubs) row[club] = yearTotals.find((t) => t.club === club)?.count ?? 0;
      return row;
    });

    return { data: rows, clubs: topClubs, config: cfg };
  }, [registrations, years]);

  if (data.length === 0 || clubs.length === 0) return <EmptyChart label={noDataLabel} />;

  // Up to 8 club lines over only a handful of year-points reads better as
  // directly-labeled lines than as a legend the eye has to keep matching
  // colors against — label each line with its club code at its last point
  // instead, and drop the legend since it's now redundant.
  const lastIndex = data.length - 1;
  // Reserve just enough room for the widest club-code label (e.g. "VKTC",
  // "Machang") plus its offset from the line's end — a flat margin clips
  // longer club codes, and over-reserving reads as unexplained empty space.
  const LABEL_OFFSET = 8;
  const rightMargin = widestLabelWidth(clubs, "12px sans-serif", 4) + LABEL_OFFSET;

  return (
    <ChartContainer config={config} className="h-[340px] w-full">
      <Recharts.LineChart data={data} margin={{ top: 8, right: rightMargin, left: 0, bottom: 16 }}>
        <Recharts.CartesianGrid vertical={false} />
        <Recharts.XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={12} padding={{ left: 0, right: 8 }} />
        <Recharts.YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {clubs.map((club) => (
          <Recharts.Line key={club} type="monotone" dataKey={club} name={club} stroke={clubChipColorVar(club)} strokeWidth={2.5} dot={{ fill: clubChipColorVar(club), r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        ))}
        <ClubEndLabels clubs={clubs} lastRow={data[lastIndex]!} />
      </Recharts.LineChart>
    </ChartContainer>
  );
}

/**
 * Renders each line's club-code label at its last point using recharts 3's
 * scale hooks (reads the chart's actual computed layout via context — this
 * replaces the deprecated `<Customized>` pattern) — then de-collides labels
 * whose values are close enough that their text would otherwise stack on
 * top of each other.
 */
function ClubEndLabels({ clubs, lastRow }: { clubs: string[]; lastRow: Record<string, string | number> }) {
  const xScale = Recharts.useXAxisScale();
  const yScale = Recharts.useYAxisScale();
  if (!xScale || !yScale) return null;

  const x = Number(xScale(String(lastRow.year))) + 10;
  const MIN_GAP = 14;
  const items = clubs
    .map((club) => ({ club, y: Number(yScale(Number(lastRow[club] ?? 0))) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) {
    if (items[i]!.y - items[i - 1]!.y < MIN_GAP) items[i]!.y = items[i - 1]!.y + MIN_GAP;
  }

  return (
    <g>
      {items.map(({ club, y }) => (
        <text key={club} x={x} y={y} dominantBaseline="middle" fontSize={12} fill={clubChipColorVar(club)}>
          {club}
        </text>
      ))}
    </g>
  );
}

// ─── Widget: club performance history (all time, with a year filter) ─────────

function ClubPerformanceHistoryWidget({ matches, allTimeLabel, noDataLabel }: { matches: MatchRow[]; allTimeLabel: string; noDataLabel: string }) {
  const years = useMemo(() => deriveYearOptions(matches.map((m) => m.tournamentYear)), [matches]);
  const [yearFilter, setYearFilter] = useState("all");

  const data = useMemo(() => {
    const scoped = yearFilter === "all" ? matches : matches.filter((m) => String(m.tournamentYear) === yearFilter);
    return clubTotalsFor(scoped).map((row) => ({ club: row.club, count: row.count, color: clubChipColorVar(row.club) }));
  }, [matches, yearFilter]);

  return (
    <div className="flex flex-col gap-3">
      <Select value={yearFilter} onChange={(e) => setYearFilter(e.currentTarget.value)} className="form-control-button-match w-fit">
        <option value="all">{allTimeLabel}</option>
        {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
      </Select>
      <ClubRankedBarChart data={data} noDataLabel={noDataLabel} />
    </div>
  );
}

// ─── Widget: teams per category (single year) ──────────────────────────────────

function TeamsPerCategoryWidget({ teams, categories, year, locale, noDataLabel }: { teams: TeamRow[]; categories: CategoryRecord[]; year: number; locale: "en" | "ko"; noDataLabel: string }) {
  const byId = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const data = useMemo(() => {
    const yearTeams = teams.filter((t) => t.tournamentYear === year);
    const counts = new Map<string, number>();
    for (const t of yearTeams) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    const catIds = [...counts.keys()].sort((a, b) => (byId.get(a)?.sortOrder ?? 99) - (byId.get(b)?.sortOrder ?? 99));
    return catIds.map((id) => ({ category: categoryLabelForId(byId, id, locale), count: counts.get(id)!, color: categoryChipColorVar(id) }));
  }, [teams, byId, year, locale]);

  const config: ChartConfig = { count: { label: "Teams" } };

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  const chartHeight = Math.max(200, data.length * 44);
  // Measured (not estimated) so labels never wrap regardless of locale/script.
  const yAxisWidth = Math.max(60, widestLabelWidth(data.map((row) => row.category)));
  // The largest bar's value label sits right at the plot's right edge — size
  // the margin to the widest value label so it's never clipped.
  const rightMargin = Math.max(16, widestLabelWidth(data.map((row) => String(row.count)), "12px sans-serif", 12));

  return (
    <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
      <Recharts.BarChart data={data} layout="vertical" margin={{ top: 8, right: rightMargin, left: 0, bottom: 8 }}>
        <Recharts.CartesianGrid horizontal={false} />
        <Recharts.XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <Recharts.YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={yAxisWidth} interval={0} />
        <Recharts.Bar dataKey="count" radius={4}>
          <Recharts.LabelList dataKey="count" position="right" />
          {data.map((row) => (
            <Recharts.Cell key={row.category} fill={row.color} />
          ))}
        </Recharts.Bar>
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── Widget: registration growth by year (all time) ───────────────────────────

// Pending doesn't say anything about growth (it's a transient in-progress
// state, not a settled outcome), so this trend only tracks the two settled
// statuses.
const REGISTRATION_GROWTH_STATUSES = REGISTRATION_STATUSES.filter((s) => s !== "Pending");

/** Stacked-bar segment label — always dark text (never the recharts default
 * white "inside" fill, which disappears against light segment colors), and
 * only rendered inside the segment when there's actually room for it.
 * Small segments (e.g. a count of 1) get the label just above their own
 * segment instead of clipped/invisible text crammed inside. */
function StackedBarValueLabel(props: { x?: number; y?: number; width?: number; height?: number; value?: number }) {
  const { x, y, width, height, value } = props;
  if (x == null || y == null || width == null || height == null || value == null || value === 0) return null;
  const text = String(value);
  const textWidth = measureTextWidth(text, "12px sans-serif");
  const fitsInside = height >= 16 && width >= textWidth + 6;
  return (
    <text
      x={x + width / 2}
      y={fitsInside ? y + height / 2 : y - 4}
      textAnchor="middle"
      dominantBaseline={fitsInside ? "central" : "auto"}
      fontSize={12}
      fontWeight={600}
      fill="var(--color-text-primary)"
    >
      {text}
    </text>
  );
}

function RegistrationGrowthWidget({ registrations, locale, noDataLabel }: { registrations: RegistrationRow[]; locale: "en" | "ko"; noDataLabel: string }) {
  const data = useMemo(() => {
    const years = deriveYearOptions(registrations.map((r) => r.tournamentYear)).sort((a, b) => a - b);
    return years.map((year) => {
      const row: Record<string, string | number> = { year: String(year) };
      for (const status of REGISTRATION_GROWTH_STATUSES) {
        row[status] = registrations.filter((r) => r.tournamentYear === year && r.status === status).length;
      }
      return row;
    });
  }, [registrations]);

  const config: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    REGISTRATION_GROWTH_STATUSES.forEach((status) => { cfg[status] = { label: registrationStatusLabel(status, locale), color: registrationStatusColor(status) }; });
    return cfg;
  }, [locale]);

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  return (
    <ChartContainer config={config} className="h-[300px] w-full">
      <Recharts.BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
        <Recharts.CartesianGrid vertical={false} />
        <Recharts.XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={12} />
        <Recharts.YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Recharts.Legend content={<ChartLegendContent />} verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 20 }} />
        {REGISTRATION_GROWTH_STATUSES.map((status) => (
          <Recharts.Bar key={status} dataKey={status} name={registrationStatusLabel(status, locale)} stackId="registrations" fill={registrationStatusColor(status)} radius={4} isAnimationActive={false}>
            <Recharts.LabelList dataKey={status} content={StackedBarValueLabel} />
          </Recharts.Bar>
        ))}
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── Widget: total teams by year (all time) ────────────────────────────────────

function TeamsGrowthWidget({ teams, noDataLabel }: { teams: TeamRow[]; noDataLabel: string }) {
  const data = useMemo(() => {
    const years = deriveYearOptions(teams.map((t) => t.tournamentYear)).sort((a, b) => a - b);
    return years.map((year) => ({ year: String(year), count: teams.filter((t) => t.tournamentYear === year).length }));
  }, [teams]);

  const config: ChartConfig = { count: { label: "Teams", color: seriesColor(1) } };

  if (data.length === 0) return <EmptyChart label={noDataLabel} />;

  const useLine = data.length >= 3;

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      {useLine ? (
        <Recharts.LineChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
          <Recharts.CartesianGrid vertical={false} />
          <Recharts.XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={12} />
          <Recharts.YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Recharts.Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={{ fill: "var(--color-count)" }} isAnimationActive={false}>
            <Recharts.LabelList dataKey="count" position="top" />
          </Recharts.Line>
        </Recharts.LineChart>
      ) : (
        <Recharts.BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <Recharts.CartesianGrid vertical={false} />
          <Recharts.XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={12} />
          <Recharts.YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Recharts.Bar dataKey="count" fill="var(--color-count)" radius={4} isAnimationActive={false}>
            <Recharts.LabelList dataKey="count" position="top" />
          </Recharts.Bar>
        </Recharts.BarChart>
      )}
    </ChartContainer>
  );
}

// ─── Widget: teams by category over time (all time, grouped horizontal bars) ──

function TeamGrowthByCategoryWidget({ teams, categories, locale, noDataLabel }: { teams: TeamRow[]; categories: CategoryRecord[]; locale: "en" | "ko"; noDataLabel: string }) {
  const byId = useMemo(() => buildCategoryByIdMap(categories), [categories]);
  const years = useMemo(() => deriveYearOptions(teams.map((t) => t.tournamentYear)).sort((a, b) => a - b), [teams]);

  const data = useMemo(() => {
    const catIds = [...new Set(teams.map((t) => t.categoryId))].sort((a, b) => (byId.get(a)?.sortOrder ?? 99) - (byId.get(b)?.sortOrder ?? 99));
    return catIds.map((id) => {
      const row: Record<string, string | number> = { category: categoryLabelForId(byId, id, locale) };
      for (const year of years) row[String(year)] = teams.filter((t) => t.categoryId === id && t.tournamentYear === year).length;
      return row;
    });
  }, [teams, byId, years, locale]);

  const config: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    years.forEach((year, i) => { cfg[String(year)] = { label: String(year), color: seriesColor(i) }; });
    return cfg;
  }, [years]);

  if (data.length === 0 || years.length === 0) return <EmptyChart label={noDataLabel} />;

  const chartHeight = Math.max(280, data.length * 84 + 40);
  const yAxisWidth = Math.max(60, widestLabelWidth(data.map((row) => String(row.category))));
  // The largest bar (across every year series) sits right at the plot's
  // right edge — size the margin to the widest value label across all
  // years so it's never clipped, not just the first series.
  const rightMargin = Math.max(16, widestLabelWidth(data.flatMap((row) => years.map((year) => String(row[String(year)] ?? 0))), "12px sans-serif", 12));

  return (
    <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
      <Recharts.BarChart data={data} layout="vertical" margin={{ top: 8, right: rightMargin, left: 0, bottom: 8 }} barCategoryGap="35%" barGap={4}>
        <Recharts.CartesianGrid horizontal={false} />
        <Recharts.XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <Recharts.YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={yAxisWidth} interval={0} />
        <Recharts.Legend content={<ChartLegendContent />} verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 20 }} />
        {years.map((year, i) => (
          <Recharts.Bar key={year} dataKey={String(year)} name={String(year)} fill={seriesColor(i)} radius={4} barSize={16}>
            <Recharts.LabelList dataKey={String(year)} position="right" />
          </Recharts.Bar>
        ))}
      </Recharts.BarChart>
    </ChartContainer>
  );
}

// ─── AdminDashboard ─────────────────────────────────────────────────────────────

export type AdminDashboardProps = {
  matches: MatchRow[];
  teams: TeamRow[];
  registrations: RegistrationRow[];
  categories: CategoryRecord[];
};

export function AdminDashboard({ matches, teams, registrations, categories }: AdminDashboardProps) {
  const { t, locale } = useLocale();
  const d = t.adminPage.dashboard;
  // URL-backed (not local state) so the selected tab survives a locale
  // switch — switching locale re-renders the page via router.refresh(),
  // and local useState would silently reset back to "This year".
  const [dashboardParams, setDashboardParam] = useUrlParams(["section"] as const);
  const section: "thisYear" | "allTime" = dashboardParams.section === "allTime" ? "allTime" : "thisYear";

  // "This year" always means the current tournament year — no year picker.
  const year = getYear();

  const buckets = useRoundBuckets(matches, year, locale, d.prelimRoundLabel);

  const totalMatches = matches.filter((m) => m.tournamentYear === year).length;
  const teamsTotal = teams.filter((tm) => tm.tournamentYear === year).length;

  return (
    <div className="flex flex-col gap-[var(--content-gap)]">
      <Tabs value={section} onValueChange={(v) => setDashboardParam("section", v === "allTime" ? "allTime" : "")}>
        <TabsList>
          <TabsTrigger value="thisYear">{d.tabs.thisYear}</TabsTrigger>
          <TabsTrigger value="allTime">{d.tabs.allTime}</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "thisYear" ? (
        <div className="flex flex-col gap-[var(--content-gap)]">
          <WidgetCard title={d.overview.registrations} caption={d.overview.registrationsSubtitle}>
            <RegistrationsWidget registrations={registrations} year={year} locale={locale} noDataLabel={d.noData} />
          </WidgetCard>

          <WidgetCard title={d.overview.teamsByCategory.title} caption={d.overview.teamsByCategory.subtitle} corner={d.totalLabel.replace("{count}", String(teamsTotal)).replace("{label}", d.teamsUnitLabel)}>
            <TeamsPerCategoryWidget teams={teams} categories={categories} year={year} locale={locale} noDataLabel={d.noData} />
          </WidgetCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WidgetCard title={d.matchProgress.completionOverTime.title} caption={d.matchProgress.completionOverTime.subtitle} corner={d.totalLabel.replace("{count}", String(totalMatches)).replace("{label}", d.matchesUnitLabel)}>
              <CompletionByDateWidget matches={matches} year={year} locale={locale} noDataLabel={d.noData} />
            </WidgetCard>
            <WidgetCard title={d.matchProgress.completionByRound.title} caption={d.matchProgress.completionByRound.subtitle}>
              <CompletionByRoundWidget matches={matches} buckets={buckets} year={year} noDataLabel={d.noData} />
            </WidgetCard>
          </div>

          <WidgetCard title={d.clubPerformance.championship.title} caption={d.clubPerformance.championship.subtitle}>
            <ClubChampionshipWidget matches={matches} registrations={registrations} year={year} noDataLabel={d.noData} legend={d.clubPerformance.championship.legend} />
          </WidgetCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WidgetCard title={d.clubPerformance.winningClubs.title} caption={d.clubPerformance.winningClubs.subtitle}>
              <WinningClubsWidget matches={matches} buckets={buckets} year={year} allRoundsLabel={d.clubPerformance.allRounds} noDataLabel={d.noData} />
            </WidgetCard>
            <WidgetCard title={d.clubPerformance.participation.title} caption={d.clubPerformance.participation.subtitle}>
              <ClubParticipationWidget registrations={registrations} year={year} noDataLabel={d.noData} />
            </WidgetCard>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <WidgetCard title={d.allTime.registrationGrowth.title} caption={d.allTime.registrationGrowth.subtitle}>
            <RegistrationGrowthWidget registrations={registrations} locale={locale} noDataLabel={d.noData} />
          </WidgetCard>
          <WidgetCard title={d.allTime.teamsGrowth.title} caption={d.allTime.teamsGrowth.subtitle}>
            <TeamsGrowthWidget teams={teams} noDataLabel={d.noData} />
          </WidgetCard>
          <WidgetCard title={d.allTime.teamGrowth.title} caption={d.allTime.teamGrowth.subtitle}>
            <TeamGrowthByCategoryWidget teams={teams} categories={categories} locale={locale} noDataLabel={d.noData} />
          </WidgetCard>
          <WidgetCard title={d.allTime.clubPerformanceHistory.title} caption={d.allTime.clubPerformanceHistory.subtitle}>
            <ClubPerformanceHistoryWidget matches={matches} allTimeLabel={d.allTime.allTimeLabel} noDataLabel={d.noData} />
          </WidgetCard>
          <WidgetCard title={d.allTime.clubParticipationHistory.title} caption={d.allTime.clubParticipationHistory.subtitle}>
            <ClubParticipationHistoryWidget registrations={registrations} noDataLabel={d.noData} />
          </WidgetCard>
        </div>
      )}
    </div>
  );
}
