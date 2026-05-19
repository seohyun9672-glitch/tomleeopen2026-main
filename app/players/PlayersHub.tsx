"use client";

import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout, createSearchMatcher } from "@/app/components/database";
import type { TableCellProps } from "@/app/components/database";
import { clubChipClass } from "@/lib/clubs";

export type PlayerRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  clubs: { code: string; name: string; nameKo: string | null }[];
};

export function PlayersHub({ rows }: { rows: PlayerRow[] }) {
  const { t, locale } = useLocale();

  return (
    <DatabaseLayout<PlayerRow>
      data={rows}
      managedFilters={[
        {
          type: "search" as const,
          param: "q",
          apply: createSearchMatcher((r: PlayerRow) => [
            r.fullNameEn,
            r.fullNameKo,
            ...r.clubs.map((c) => c.code),
            ...r.clubs.map((c) => c.name),
          ]),
        },
      ]}
      view={{
        type: "table" as const,
        variant: "data" as const,
        columns: [
          {
            header: t.shared.labels.name,
            sortKey: "name",
            sortValue: (p: PlayerRow) =>
              locale === "ko" ? p.fullNameKo || p.fullNameEn : p.fullNameEn,
            renderCell: (p: PlayerRow): TableCellProps => ({
              type: "text",
              value:
                locale === "ko" ? p.fullNameKo || p.fullNameEn : p.fullNameEn,
            }),
          },
          {
            header: t.shared.labels.club,
            sortKey: "club",
            sortValue: (p: PlayerRow) => p.clubs[0]?.code ?? "",
            renderCell: (p: PlayerRow): TableCellProps => ({
              type: "chips",
              items: p.clubs.map((c) => ({
                label: c.code,
                className: clubChipClass(c.code),
              })),
            }),
          },
        ],
      }}
      emptyText={t.playersPage.emptyStateNoMatch}
    />
  );
}
