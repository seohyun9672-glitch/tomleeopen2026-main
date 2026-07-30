"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import type { ManagedFilterConfig, ManagedSortConfig } from "@/app/components/database";
import type { CategoryOption } from "@/lib/categories";
import type { PlayerTitle } from "@/lib/records";
import type { Match } from "@/lib/matches";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { PlayerRecordModal } from "@/app/records/PlayerRecordModal";
import { PlayerRecordCard, type RecordSortKey } from "@/app/records/PlayerRecordCard";

export type PlayerRecordRow = {
  playerId: number;
  fullNameEn: string;
  fullNameKo: string | null;
  clubs: { code: string; name: string; nameKo: string | null }[];
  wins: number;
  losses: number;
  winRate: number;
  matchesCount: number;
  categories: CategoryOption[];
  titlesCount: number;
};

type Props = {
  rows: PlayerRecordRow[];
  titlesByPlayerId: Record<number, PlayerTitle[]>;
  historyByPlayerId: Record<number, Record<number, Match[]>>;
};

const SORT_KEYS = ["titles", "winRate", "wins", "matches"] as const;
const DEFAULT_SORT_KEY: RecordSortKey = "titles";

export function RecordsHub({ rows, titlesByPlayerId, historyByPlayerId }: Props) {
  const { t } = useLocale();
  const r = t.recordsPage;
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // DatabaseLayout owns the "sort" URL param internally — resolve the same
  // value here too (same fallback rule) purely so it can be passed down to
  // each card for the rotating top-right stat.
  const [rawSort] = useUrlParam("sort");
  const sortKey: RecordSortKey = (SORT_KEYS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as RecordSortKey)
    : DEFAULT_SORT_KEY;

  const managedFilters: ManagedFilterConfig<PlayerRecordRow>[] = [
    {
      type: "search" as const,
      apply: (items: PlayerRecordRow[], q: string) => {
        const lower = q.toLowerCase();
        return items.filter((row) =>
          row.fullNameEn.toLowerCase().includes(lower) ||
          (row.fullNameKo ?? "").toLowerCase().includes(lower),
        );
      },
    },
  ];

  const sort: ManagedSortConfig<PlayerRecordRow> = {
    options: [
      { value: "titles", label: r.sortByTitles },
      { value: "winRate", label: r.sortByWinRate },
      { value: "wins", label: r.sortByWins },
      { value: "matches", label: r.sortByMatches },
    ],
    defaultValue: DEFAULT_SORT_KEY,
    apply: (items, value) =>
      [...items].sort((a, b) => {
        switch (value) {
          case "titles": return b.titlesCount - a.titlesCount || b.winRate - a.winRate;
          case "wins": return b.wins - a.wins || b.winRate - a.winRate;
          case "matches": return b.matchesCount - a.matchesCount || b.winRate - a.winRate;
          case "winRate":
          default: return b.winRate - a.winRate || b.wins - a.wins;
        }
      }),
  };

  const selectedRow = selectedPlayerId != null ? rows.find((row) => row.playerId === selectedPlayerId) ?? null : null;

  return (
    <>
      <DatabaseLayout<PlayerRecordRow>
        data={rows}
        managedFilters={managedFilters}
        sort={sort}
        searchAlwaysOpen
        emptyText={r.emptyStateNoMatch}
        contentClassName="mt-[var(--content-gap)]"
        view={{
          getKey: (row) => row.playerId,
          renderItem: (row, i) => (
            <PlayerRecordCard row={row} rank={i + 1} sortKey={sortKey} onClick={() => setSelectedPlayerId(row.playerId)} />
          ),
          gridClass: "grid-cols-1 sm:grid-cols-2",
        }}
      />

      <PlayerRecordModal
        open={selectedRow != null}
        onClose={() => setSelectedPlayerId(null)}
        row={selectedRow}
        titles={selectedRow ? titlesByPlayerId[selectedRow.playerId] ?? [] : []}
        historyByYear={selectedRow ? historyByPlayerId[selectedRow.playerId] ?? {} : {}}
      />
    </>
  );
}
