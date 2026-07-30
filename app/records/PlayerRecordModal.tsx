"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { Modal } from "@/app/components/ui/Modal";
import { Chip } from "@/app/components/ui/Chip";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { MatchCard } from "@/app/components/MatchCard";
import { clubChipClass } from "@/lib/clubs";
import { sortMatchesForDisplay } from "@/lib/matches";
import type { Match } from "@/lib/matches";
import type { PlayerTitle } from "@/lib/records";
import type { PlayerRecordRow } from "@/app/records/RecordsHub";
import { displayName } from "@/lib/names";

type Props = {
  open: boolean;
  onClose: () => void;
  row: PlayerRecordRow | null;
  titles: PlayerTitle[];
  historyByYear: Record<number, Match[]>;
};

type StatTileProps = {
  value: string;
  label: string;
  className?: string;
};

function StatTile({ value, label, className = "" }: StatTileProps) {
  return (
    <div
      className={[
        "flex min-w-0 flex-col items-center justify-center gap-0.5 px-2 py-3 text-center",
        className,
      ].join(" ")}
    >
      <p className="max-w-full truncate text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        {label}
      </p>
    </div>
  );
}

export function PlayerRecordModal({
  open,
  onClose,
  row,
  titles,
  historyByYear,
}: Props) {
  const { t, locale } = useLocale();
  const r = t.recordsPage;
  const [activeYear, setActiveYear] = useState("all");

  if (!row) {
    return (
      <Modal open={false} onClose={onClose}>
        {null}
      </Modal>
    );
  }

  const years = Object.keys(historyByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const sortedTitles = [...titles].sort(
    (a, b) => b.tournamentYear - a.tournamentYear,
  );

  const selectedYears =
    activeYear === "all"
      ? years
      : years.filter((year) => String(year) === activeYear);

  const visibleMatches = selectedYears.flatMap((year) =>
    sortMatchesForDisplay(historyByYear[year] ?? []),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={r.modalTitle}
      maxWidthClass="max-w-2xl"
    >
      <div className="flex flex-col gap-[var(--content-gap)]">
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {displayName(row.fullNameEn, row.fullNameKo, locale)}
          </p>

          {row.clubs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {row.clubs.map((club) => (
                <Chip
                  key={club.code}
                  label={club.code}
                  size="sm"
                  shape="rounded"
                  className={clubChipClass(club.code)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-border-ui)] sm:grid-cols-4">
          <StatTile
            value={`${row.winRate}%`}
            label={r.statWinRate}
            className="border-b border-r border-[var(--color-border-ui)] sm:border-b-0"
          />

          <StatTile
            value={`${row.wins}${r.columnWins} ${row.losses}${r.columnLosses}`}
            label={r.statRecord}
            className="border-b border-[var(--color-border-ui)] sm:border-b-0 sm:border-r"
          />

          <StatTile
            value={String(row.matchesCount)}
            label={r.statMatches}
            className="border-r border-[var(--color-border-ui)]"
          />

          <StatTile
            value={String(row.categories.length)}
            label={r.statCategories}
          />
        </div>

        {sortedTitles.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              {r.titlesHeading}
            </h3>

            <ul className="flex flex-col gap-1.5">
              {sortedTitles.map((title, index) => {
                const categoryLabel =
                  locale === "ko"
                    ? title.categoryLabelKo ?? title.categoryLabel
                    : title.categoryLabel;

                const tierLabel =
                  locale === "ko"
                    ? title.tierKo ?? title.tier
                    : title.tier;

                return (
                  <li
                    key={`${title.tournamentYear}-${title.categoryLabel}-${title.tier}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-strong)] px-3 py-2 text-sm"
                  >
                    <span className="shrink-0 font-medium tabular-nums">
                      {`'${String(title.tournamentYear).slice(-2)}`}
                    </span>

                    <span className="min-w-0 flex-1 truncate">
                      {tierLabel
                        ? `${categoryLabel} · ${tierLabel}`
                        : categoryLabel}
                    </span>

                    <span className="shrink-0" aria-hidden>
                      🏆
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            {r.matchHistoryHeading}
          </h3>

          {years.length > 1 && (
            <Tabs value={activeYear} onValueChange={setActiveYear}>
              <TabsList>
                <TabsTrigger value="all">
                  {t.shared.labels.all}
                </TabsTrigger>

                {years.map((year) => (
                  <TabsTrigger key={year} value={String(year)}>
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {visibleMatches.length > 0 ? (
            <ul className="flex flex-col gap-[var(--content-gap)]">
              {visibleMatches.map((match) => (
                <li key={match.id}>
                  <MatchCard match={match} hideFooter showYear />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
              {locale === "ko"
                ? "표시할 경기 기록이 없습니다."
                : "No match history available."}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}