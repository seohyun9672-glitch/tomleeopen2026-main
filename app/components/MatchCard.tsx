"use client";

import { Chip } from "@/app/components/ui/Chip";
import { Label } from "@/app/components/ui/Label";
import { useLocale } from "@/lib/locale-context";
import type { Match } from "@/lib/matches";
import { matchStatusLabel, matchStatusChipClass, formatTimeDisplay } from "@/lib/matches";
import { ROUND_PRE } from "@/lib/round";
import { cn } from "@/lib/utils";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function formatDateDisplay(
  dateStr: string | null,
  locale: "en" | "ko" = "en",
): string | null {
  if (!dateStr?.trim()) return null;
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

function hasSet3(match: Match): boolean {
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

function getWithdrew(match: Match): { team1: boolean; team2: boolean } {
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

function getLocalizedTeamName(
  match: Match,
  team: 1 | 2,
  locale: "en" | "ko",
): string | null {
  if (team === 1) {
    return locale === "ko"
      ? (match.team1DisplayNameKo ?? match.team1DisplayName)
      : match.team1DisplayName;
  }
  return locale === "ko"
    ? (match.team2DisplayNameKo ?? match.team2DisplayName)
    : match.team2DisplayName;
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
// Badges appear only on knockout-stage matches. The round code "Pre" means
// preliminary group play — ranks aren't shown there (they're the source of the
// ranking, not the result). Every other stage (R16 → Final) shows the
// seeding badge so viewers can see how each team entered the bracket.

function rankBadgeClass(isLoser: boolean): string {
  return isLoser
    ? "shrink-0 border tabular-nums border-[color-mix(in_srgb,var(--color-secondary-blue-400)_40%,var(--color-surface-card))] bg-[color-mix(in_srgb,var(--color-secondary-blue-300)_18%,var(--color-surface-card))] text-[var(--color-primary-blue-700)]"
    : "shrink-0 border tabular-nums border-[color-mix(in_srgb,var(--color-secondary-blue-500)_28%,var(--color-surface-card))] bg-[color-mix(in_srgb,var(--color-secondary-blue-500)_22%,var(--color-surface-card))] text-[var(--color-primary-blue-800)]";
}

// ─── Style constants ──────────────────────────────────────────────────────────

const LOSER_TEXT = "text-[var(--color-text-tertiary)]";
const WINNER_TEXT = "text-[var(--color-text-primary)]";

const CARD_CLASS =
  "w-full min-w-0 overflow-hidden rounded-lg bg-[var(--color-surface-card)] shadow-sm";
const HEADER_CLASS =
  "flex w-full min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden rounded-t-lg border-b border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-secondary-blue-500)_18%,var(--color-surface-card))] px-2.5 py-2 text-[var(--color-primary-blue-900)] font-medium max-[380px]:px-2 max-[380px]:py-1.5 min-h-10";
const BODY_CLASS =
  "w-full min-w-0 divide-y divide-[color:var(--color-border-ui)] px-2.5 py-0 max-[380px]:px-2";
const TEAM_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-3 py-2 max-[380px]:gap-2 max-[380px]:py-1.5 md:flex-nowrap min-h-10";
const FOOTER_CLASS =
  "flex w-full min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 bg-[var(--color-surface-strong)] px-2.5 py-1.5 text-[var(--color-text-secondary)] max-[380px]:px-2 max-[380px]:py-1.5 min-h-10";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultIndicator({ won }: { won: boolean }) {
  if (won) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center"
        aria-hidden
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-primary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
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
}: {
  displayName: string | null;
  withdrew: boolean;
  rank?: number | null;
  isLoser?: boolean;
  withdrewLabel: string;
  rankAriaLabel?: string | null;
}) {
  const names = (displayName ?? "—").split(/\s*\/\s*/).filter(Boolean);
  if (names.length === 0) names.push("—");

  return (
    <div className="flex min-w-0 shrink flex-wrap items-center gap-1.5 md:flex-nowrap md:gap-2">
      {rank != null ? (
        <Chip
          label={String(rank)}
          size="sm"
          shape="rounded"
          aria-label={rankAriaLabel ?? undefined}
          className={cn(
            "min-w-[1rem] px-1 justify-center",
            rankBadgeClass(isLoser),
          )}
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-1">
        {names.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className={cn(
              "truncate font-medium leading-tight md:whitespace-nowrap",
              isLoser ? LOSER_TEXT : WINNER_TEXT,
            )}
          >
            {name.trim()}
          </span>
        ))}
      </div>

      {withdrew ? (
        <Chip
          label={withdrewLabel}
          size="sm"
          shape="rounded"
          className="shrink-0 player-status-withdrew"
        />
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
  return (
    <div
      className={cn(
        "grid shrink-0 items-center justify-items-center gap-x-2 tabular-nums leading-tight max-[380px]:gap-x-1.5 sm:gap-x-2.5",
        showSet3 ? "grid-cols-4" : "grid-cols-3",
        isLoser ? LOSER_TEXT : WINNER_TEXT,
      )}
    >
      <div className="flex items-center justify-center">
        <ResultIndicator won={won} />
      </div>
      <div className="flex min-w-[1.25rem] items-center justify-center">
        {set1}
      </div>
      <div className="flex min-w-[1.25rem] items-center justify-center">
        {set2}
      </div>
      {showSet3 ? (
        <div className="flex min-w-[1.25rem] items-center justify-center">
          {set3}
        </div>
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
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function DateIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
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
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

type Props = {
  match: Match;
  team1Rank?: number | null;
  team2Rank?: number | null;
  fillHeight?: boolean;
  omitCategoryInHeader?: boolean;
  /** When provided, shown in the header instead of the match number. */
  group?: string | null;
};

export function MatchCard({
  match,
  team1Rank,
  team2Rank,
  fillHeight = false,
  omitCategoryInHeader = false,
  group,
}: Props) {
  const { t, locale } = useLocale();
  const mUi = t.matchUi;

  const isCancelled = /^cancell?ed$/i.test(match.matchStatus?.trim() ?? "");

  const winner = match.winner;
  const team1Won = winner === 1;
  const team2Won = winner === 2;
  const team1Loser = winner === 2;
  const team2Loser = winner === 1;

  // Rank badges appear only in knockout stages. Prelim round code is "Pre" —
  // those matches generate the rankings that feed the bracket; they don't display them.
  const isKnockout = match.round?.code !== ROUND_PRE;
  const rank1 = isKnockout ? (team1Rank ?? null) : null;
  const rank2 = isKnockout ? (team2Rank ?? null) : null;

  const showSet3 = !isCancelled && hasSet3(match);
  const withdrew = isCancelled
    ? { team1: false, team2: false }
    : getWithdrew(match);
  const statusLabel = matchStatusLabel(match.matchStatus, locale);
  const statusClassName = matchStatusChipClass(match.matchStatus);

  const team1Name = getLocalizedTeamName(match, 1, locale);
  const team2Name = getLocalizedTeamName(match, 2, locale);

  const categoryPart =
    locale === "ko"
      ? (match.categoryDisplayLabelKo ?? match.categoryDisplayLabel ?? match.categoryId)
      : (match.categoryDisplayLabel ?? match.categoryId);
  const roundPart =
    locale === "ko"
      ? (match.round?.labelKo ?? match.round?.labelEn ?? match.round?.code ?? "—")
      : (match.round?.labelEn ?? match.round?.code ?? "—");
  const matchSeq = (() => {
    const code = match.round?.code;
    if (!code) return null;
    const idx = match.id.lastIndexOf(code);
    if (idx === -1) return null;
    const after = match.id.slice(idx + code.length);
    return /^[A-Za-z]?(\d+)$/.exec(after)?.[1] ?? null;
  })();
  const headerLine = omitCategoryInHeader
    ? [roundPart, group ?? (matchSeq ? `#${matchSeq}` : null)].filter(Boolean).join(" ")
    : group != null
    ? [categoryPart, roundPart, group].filter(Boolean).join(" · ")
    : [categoryPart, roundPart, matchSeq ? `#${matchSeq}` : null].filter(Boolean).join(" · ");

  const displayLocation = match.location?.trim() || null;
  const displayDate = formatDateDisplay(match.date ?? null, locale);
  const displayTime = match.time?.trim() ? formatTimeDisplay(match.time) : null;

  const teams = [
    {
      key: "team-1",
      displayName: team1Name,
      withdrew: withdrew.team1,
      rank: rank1,
      isLoser: team1Loser,
      won: team1Won,
      set1: match.set1ScoreTeam1,
      set2: match.set2ScoreTeam1,
      set3: match.set3ScoreTeam1,
    },
    {
      key: "team-2",
      displayName: team2Name,
      withdrew: withdrew.team2,
      rank: rank2,
      isLoser: team2Loser,
      won: team2Won,
      set1: match.set1ScoreTeam2,
      set2: match.set2ScoreTeam2,
      set3: match.set3ScoreTeam2,
    },
  ];

  return (
    <article
      className={cn(
        CARD_CLASS,
        "md:min-w-[var(--match-card-min-width)]",
        fillHeight && "flex h-full min-h-0 flex-col",
      )}
    >
      <div className={HEADER_CLASS}>
        <span className="min-w-0 flex-1 font-semibold" title={headerLine}>
          {headerLine}
        </span>
        <Chip
          label={statusLabel}
          size="sm"
          shape="rounded"
          className={cn("min-w-0 shrink-0", statusClassName)}
        />
      </div>

      <div
        className={cn(BODY_CLASS, fillHeight && "flex min-h-0 flex-1 flex-col")}
      >
        {teams.map((team) => (
          <TeamRow
            key={team.key}
            displayName={team.displayName}
            withdrew={team.withdrew}
            rank={team.rank}
            isLoser={team.isLoser}
            won={team.won}
            withdrewLabel={mUi.withdrew}
            rankAriaLabel={team.rank != null ? mUi.rankAria(team.rank) : null}
            set1={team.set1}
            set2={team.set2}
            set3={team.set3}
            showSet3={showSet3}
            fillHeight={fillHeight}
          />
        ))}
      </div>

      {(displayLocation || displayDate || displayTime) ? (
        <div className={FOOTER_CLASS}>
          <Label icon={<LocationIcon />} value={displayLocation} truncate className="min-w-0" />
          <Label icon={<DateIcon />} value={displayDate} className="shrink-0" />
          <Label icon={<TimeIcon />} value={displayTime} className="shrink-0" />
        </div>
      ) : null}
    </article>
  );
}
