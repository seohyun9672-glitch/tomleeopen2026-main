"use client";

import { Badge } from "@/app/components/ui/Badge";
import { useLocale } from "@/lib/locale-context";
import type { MatchWithTeamNames } from "@/lib/matches";
import { matchStatusLabel, matchStatusChipClass } from "@/lib/matches";
import { showNumber } from "@/lib/round";
import { cn } from "@/lib/utils";

function formatDateDisplay(dateStr: string | null, locale: "en" | "ko" = "en"): string {
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

function hasSet3(match: MatchWithTeamNames): boolean {
  return (
    (match.set3ScoreTeam1 != null && match.set3ScoreTeam1 !== "") ||
    (match.set3ScoreTeam2 != null && match.set3ScoreTeam2 !== "")
  );
}

function parseScore(score: string | null): number | null {
  if (score == null || score === "") return null;

  const value = parseInt(score, 10);
  return Number.isNaN(value) ? null : value;
}

function getWithdrew(match: MatchWithTeamNames): { team1: boolean; team2: boolean } {
  const noSchedule = !match.location?.trim() && !match.date?.trim() && !match.time?.trim();
  if (!noSchedule) return { team1: false, team2: false };

  const s1t1 = parseScore(match.set1ScoreTeam1);
  const s1t2 = parseScore(match.set1ScoreTeam2);
  const s2t1 = parseScore(match.set2ScoreTeam1);
  const s2t2 = parseScore(match.set2ScoreTeam2);

  if (s1t1 == null || s1t2 == null || s2t1 == null || s2t2 == null) {
    return { team1: false, team2: false };
  }

  return {
    team1: s1t1 === 0 && s2t1 === 0 && s1t2 === 6 && s2t2 === 6,
    team2: s1t2 === 0 && s2t2 === 0 && s1t1 === 6 && s2t1 === 6,
  };
}

const LOSER_NAME = "text-[var(--match-text-loser)]";
const WINNER_NAME = "text-[var(--match-text-winner)]";

const LOSER_RANK_BADGE =
  "shrink-0 border border-[var(--match-rank-loser-border)] bg-[var(--match-rank-loser-bg)] text-[var(--match-rank-loser-text)] tabular-nums";
const WINNER_RANK_BADGE =
  "shrink-0 border border-[var(--match-rank-win-border)] bg-[var(--match-rank-win-bg)] text-[var(--match-rank-win-text)] tabular-nums";

const BRACKET_WINNER_RANK_BADGE =
  "shrink-0 border border-[var(--match-rank-bracket-win-border)] bg-[var(--match-rank-bracket-win-bg)] text-[var(--match-rank-bracket-win-text)] tabular-nums";
const BRACKET_LOSER_RANK_BADGE =
  "shrink-0 border border-[var(--match-rank-bracket-lose-border)] bg-[var(--match-rank-bracket-lose-bg)] text-[var(--match-rank-bracket-lose-text)] tabular-nums";

const SCORE_WINNER = "text-[var(--match-text-winner)]";
const SCORE_LOSER = "text-[var(--match-text-loser)]";

const CARD_CLASS =
  "w-full min-w-0 overflow-hidden rounded-lg bg-[var(--color-surface-card)] shadow-sm";
const HEADER_CLASS =
  "match-stage-header flex w-full min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden rounded-t-lg border-b border-[var(--color-accent)] bg-[var(--match-stage-header-bg)] px-2.5 py-2 max-[380px]:px-2 max-[380px]:py-1.5";
const BODY_CLASS =
  "w-full min-w-0 divide-y divide-[color:var(--color-border-ui)] px-2.5 py-0 max-[380px]:px-2";
const TEAM_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-3 py-2 max-[380px]:gap-2 max-[380px]:py-1.5 md:flex-nowrap";
const META_CLASS =
  "flex w-full min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 bg-[var(--match-card-meta-bg)] px-2.5 py-1.5 text-[var(--match-card-meta-text)] max-[380px]:px-2 max-[380px]:py-1.5";

function ResultIndicator({ won }: { won: boolean }) {
  const iconClass = "h-3.5 w-3.5 shrink-0 text-[var(--color-text-primary)]";

  if (won) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  return <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />;
}

function TeamNameBlock({
  displayName,
  withdrew,
  rank,
  isLoser = false,
  withdrewLabel,
  rankAriaLabel,
  eliminationBracket = false,
}: {
  displayName: string | null;
  withdrew: boolean;
  rank?: number | null;
  isLoser?: boolean;
  withdrewLabel: string;
  rankAriaLabel?: string | null;
  eliminationBracket?: boolean;
}) {
  const names = (displayName ?? "—").split(/\s*\/\s*/).filter(Boolean);
  if (names.length === 0) names.push("—");

  const nameClass = isLoser ? LOSER_NAME : WINNER_NAME;
  const rankBadgeClass = eliminationBracket
    ? isLoser
      ? BRACKET_LOSER_RANK_BADGE
      : BRACKET_WINNER_RANK_BADGE
    : isLoser
      ? LOSER_RANK_BADGE
      : WINNER_RANK_BADGE;

  return (
    <div className="flex min-w-0 shrink flex-wrap items-center gap-1.5 md:flex-nowrap md:gap-2">
      {rank != null ? (
        <Badge
          variant="outline"
          aria-label={rankAriaLabel ?? undefined}
          className={cn(
            "min-w-0 shrink-0 rounded-[var(--radius-badge)] px-1 py-px text-xs font-bold leading-none",
            rankBadgeClass
          )}
        >
          {rank}
        </Badge>
      ) : null}

      <div className="flex min-w-0 flex-col gap-1">
        {names.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className={cn("truncate font-medium leading-tight md:whitespace-nowrap", nameClass)}
          >
            {name.trim()}
          </span>
        ))}
      </div>

      {withdrew ? (
        <Badge
          variant="outline"
          className="shrink-0 rounded-[var(--radius-badge)] border-[var(--match-withdrew-border)] bg-[var(--match-withdrew-bg)] px-3 py-1 text-xs font-semibold text-[var(--match-withdrew-text)]"
        >
          {withdrewLabel}
        </Badge>
      ) : null}
    </div>
  );
}

function ScoreRowGrid({
  won,
  set1,
  set2,
  set3,
  showSet3,
  isLoser = false,
}: {
  won: boolean;
  set1: string | null;
  set2: string | null;
  set3: string | null;
  showSet3: boolean;
  isLoser?: boolean;
}) {
  const toneClass = isLoser ? SCORE_LOSER : SCORE_WINNER;

  return (
    <div
      className={cn(
        "grid shrink-0 items-center justify-items-center gap-x-2 tabular-nums leading-tight max-[380px]:gap-x-1.5 sm:gap-x-2.5",
        showSet3 ? "grid-cols-4" : "grid-cols-3",
        toneClass
      )}
    >
      <div className="flex items-center justify-center">
        <ResultIndicator won={won} />
      </div>
      <div className="flex min-w-[1.25rem] items-center justify-center">{(set1)}</div>
      <div className="flex min-w-[1.25rem] items-center justify-center">{(set2)}</div>
      {showSet3 ? (
        <div className="flex min-w-[1.25rem] items-center justify-center">{(set3)}</div>
      ) : null}
    </div>
  );
}

function TeamRow({
  displayName,
  withdrew,
  rank,
  isLoser,
  won,
  withdrewLabel,
  rankAriaLabel,
  eliminationBracket,
  set1,
  set2,
  set3,
  showSet3,
  fillHeight,
}: {
  displayName: string | null;
  withdrew: boolean;
  rank?: number | null;
  isLoser: boolean;
  won: boolean;
  withdrewLabel: string;
  rankAriaLabel?: string | null;
  eliminationBracket: boolean;
  set1: string | null;
  set2: string | null;
  set3: string | null;
  showSet3: boolean;
  fillHeight: boolean;
}) {
  return (
    <div className={cn(TEAM_ROW_CLASS, fillHeight && "min-h-0 flex-1")}>
      <div className="min-w-0 flex-1 overflow-hidden md:overflow-visible">
        <TeamNameBlock
          displayName={displayName}
          withdrew={withdrew}
          rank={rank}
          isLoser={isLoser}
          withdrewLabel={withdrewLabel}
          rankAriaLabel={rankAriaLabel}
          eliminationBracket={eliminationBracket}
        />
      </div>

      <div className="ml-auto shrink-0">
        <ScoreRowGrid
          won={won}
          set1={set1}
          set2={set2}
          set3={set3}
          showSet3={showSet3}
          isLoser={isLoser}
        />
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DateIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TimeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

type Props = {
  match: MatchWithTeamNames;
  team1Rank?: number | null;
  team2Rank?: number | null;
  fillHeight?: boolean;
  omitCategoryInHeader?: boolean;
};

export function MatchCard({
  match,
  team1Rank,
  team2Rank,
  fillHeight = false,
  omitCategoryInHeader = false,
}: Props) {
  const { t, locale } = useLocale();
  const mUi = t.matchUi;

  const winner = match.winner;
  const team1Won = winner === 1;
  const team2Won = winner === 2;
  const team1Loser = winner === 2;
  const team2Loser = winner === 1;

  const rank1 = showNumber(match.round, team1Loser) ? team1Rank : null;
  const rank2 = showNumber(match.round, team2Loser) ? team2Rank : null;
  const eliminationBracket = rank1 != null || rank2 != null;

  const showSet3 = hasSet3(match);
  const withdrew = getWithdrew(match);
  const matchWithdrawn = withdrew.team1 || withdrew.team2;

  const statusLabel = matchStatusLabel(match.matchStatus, locale);
  const statusClassName = matchStatusChipClass(match.matchStatus);

  const team1Name =
    locale === "ko" ? (match.team1DisplayNameKo ?? match.team1DisplayName) : match.team1DisplayName;
  const team2Name =
    locale === "ko" ? (match.team2DisplayNameKo ?? match.team2DisplayName) : match.team2DisplayName;

  const categoryPart =
    (locale === "ko" ? match.categoryDisplayLabelKo ?? match.categoryDisplayLabel : match.categoryDisplayLabel) ??
    "—";

  const roundPart =
    locale === "ko" ? (match.round?.labelKo ?? match.round?.labelEn ?? "—") : (match.round?.labelEn ?? "—");

  const matchNumberPart =
    showNumber(match.round) && match.matchNumber != null ? `#${match.matchNumber}` : null;

  const headerLine = omitCategoryInHeader
    ? [roundPart, matchNumberPart].filter(Boolean).join(" ")
    : [categoryPart, roundPart, matchNumberPart].filter(Boolean).join(" · ").replace(" · #", " #");

  const displayLocation = match.location?.trim() || "—";
  const displayDate = formatDateDisplay(match.date ?? null, locale);
  const displayTime = match.time?.trim() || "—";

  return (
    <article
      className={cn(
        CARD_CLASS,
        "md:min-w-[var(--match-card-min-width)]",
        fillHeight && "flex h-full min-h-0 flex-col"
      )}
    >
      <div className={HEADER_CLASS}>
        <span className="min-w-0 flex-1 truncate" title={headerLine}>
          {headerLine}
        </span>
        <Badge
          variant="outline"
          className={cn("min-w-0 shrink-0 px-3 py-1 text-xs font-semibold", statusClassName)}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className={cn(BODY_CLASS, fillHeight && "flex min-h-0 flex-1 flex-col")}>
        <TeamRow
          displayName={team1Name}
          withdrew={withdrew.team1}
          rank={rank1}
          isLoser={team1Loser}
          won={team1Won}
          withdrewLabel={mUi.withdrew}
          rankAriaLabel={rank1 != null ? mUi.rankAria(rank1) : null}
          eliminationBracket={eliminationBracket}
          set1={match.set1ScoreTeam1}
          set2={match.set2ScoreTeam1}
          set3={match.set3ScoreTeam1}
          showSet3={showSet3}
          fillHeight={fillHeight}
        />

        <TeamRow
          displayName={team2Name}
          withdrew={withdrew.team2}
          rank={rank2}
          isLoser={team2Loser}
          won={team2Won}
          withdrewLabel={mUi.withdrew}
          rankAriaLabel={rank2 != null ? mUi.rankAria(rank2) : null}
          eliminationBracket={eliminationBracket}
          set1={match.set1ScoreTeam2}
          set2={match.set2ScoreTeam2}
          set3={match.set3ScoreTeam2}
          showSet3={showSet3}
          fillHeight={fillHeight}
        />
      </div>

      {!matchWithdrawn ? (
        <div className={META_CLASS}>
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <LocationIcon />
            <span className="truncate">{displayLocation}</span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            <DateIcon />
            {displayDate}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            <TimeIcon />
            {displayTime}
          </span>
        </div>
      ) : null}
    </article>
  );
}