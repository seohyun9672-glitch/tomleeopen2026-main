"use client";

import { useLocale } from "@/lib/locale-context";
import { Chip } from "@/app/components/ui/Chip";
import { Divider } from "@/app/components/ui/Divider";
import { clubChipClass } from "@/lib/clubs";
import { displayName } from "@/lib/names";
import type { PlayerRecordRow } from "@/app/records/RecordsHub";

export type RecordSortKey = "titles" | "winRate" | "wins" | "matches";

type Props = {
  row: PlayerRecordRow;
  rank: number;
  sortKey: RecordSortKey;
  onClick: () => void;
};

export function PlayerRecordCard({ row, rank, sortKey, onClick }: Props) {
  const { t, locale } = useLocale();
  const r = t.recordsPage;

  const rankLabel = locale === "ko" ? `${rank}위` : `#${rank}`;

  const heroStat = {
    titles: { value: String(row.titlesCount), label: r.sortByTitles },
    winRate: { value: `${row.winRate}%`, label: r.sortByWinRate },
    wins: { value: String(row.wins), label: r.sortByWins },
    matches: { value: String(row.matchesCount), label: r.sortByMatches },
  }[sortKey];

  const statItems = [
    {
      value: `${row.winRate}%`,
      label: locale === "ko" ? "승률" : "Win rate",
    },
    {
      value:
        locale === "ko"
          ? `${row.wins}승 ${row.losses}패`
          : `${row.wins}W ${row.losses}L`,
      label: locale === "ko" ? "전적" : "Record",
    },
    {
      value: `${row.matchesCount}`,
      label: locale === "ko" ? "경기" : "Matches",
    },
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[var(--color-border-ui)] bg-[var(--color-surface-card)] p-4 text-left shadow-sm transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums text-[var(--color-text-tertiary)]">
            {rankLabel}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-semibold text-[var(--color-text-primary)]">
                {displayName(row.fullNameEn, row.fullNameKo, locale)}
              </p>

              {row.titlesCount > 0 && (
                <span
                  className="shrink-0 text-sm tabular-nums text-[var(--color-text-secondary)]"
                  aria-label={
                    locale === "ko"
                      ? `우승 ${row.titlesCount}회`
                      : `${row.titlesCount} titles`
                  }
                >
                  🏆 {row.titlesCount}
                </span>
              )}
            </div>

            {row.clubs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
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
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-extrabold leading-none tabular-nums text-[var(--color-primary-blue-600)]">
            {heroStat.value}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {heroStat.label}
          </p>
        </div>
      </div>

      <div className="pb-3 pt-4">
        <Divider />
      </div>

      <div className="grid grid-cols-3">
        {statItems.map((item, index) => (
          <div
            key={item.label}
            className={[
              "flex flex-col items-center px-2 text-center",
              index > 0
                ? "border-l border-[var(--color-border-ui)]"
                : "",
            ].join(" ")}
          >
            <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </button>
  );
}
