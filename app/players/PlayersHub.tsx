"use client";

import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import { TableView } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { displayName } from "@/lib/names";
import { makeGroupBreakBefore } from "@/lib/utils";
import type { ManagedFilterConfig } from "@/app/components/database";
import type { TeamRow } from "@/app/admin/AdminHub";
import { deriveYearOptions } from "@/app/components/database";
import {
  buildCategoryByIdMap,
  deriveGroupedCategoryOptions,
} from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";

export type PlayerRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  clubs: { code: string; name: string; nameKo: string | null }[];
  registrations: {
    year: number;
    categoryId: string;
    label: string;
    labelKo: string | null;
  }[];
};

export function PlayersHub({ teams, categories }: { rows: PlayerRow[]; teams: TeamRow[]; categories: CategoryRecord[] }) {
  const { t, locale } = useLocale();
  const p = t.playersPage;
  const a = t.adminPage;

  const teamYears = deriveYearOptions(teams.map((r) => r.tournamentYear));
  const categoriesById = buildCategoryByIdMap(categories);

  const [teamCatParams] = useUrlParams(["cat"] as const);

  const categoryMap = new Map(
    teams.map((r) => [r.categoryId, { label: r.categoryLabel, labelKo: r.categoryLabelKo }])
  );

  const teamManagedFilters: ManagedFilterConfig<TeamRow>[] = [
    {
      type: "year" as const,
      years: teamYears,
      apply: (items: TeamRow[], year: string) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
      clearParams: ["seed"],
    },
    {
      type: "category" as const,
      param: "cat",
      options: (prevItems: TeamRow[]) => deriveGroupedCategoryOptions(prevItems.map((r) => r.categoryId), categoriesById),
      apply: (items: TeamRow[], categoryId: string) =>
        categoryId ? items.filter((r) => r.categoryId === categoryId) : items,
      allLabel: t.shared.labels.allCategories,
      clearParams: ["seed"],
    },
    {
      type: "seed" as const,
      options: (prevItems: TeamRow[]) => {
        const seen = new Set<string>();
        for (const tm of prevItems) { if (tm.seed) seen.add(tm.seed); }
        return [...seen].sort();
      },
      apply: (items: TeamRow[], seed: string) => (seed ? items.filter((r) => r.seed === seed) : items),
      allLabel: t.shared.labels.seed,
      visibleWhen: (v) => !!v.cat,
    },
    {
      type: "search" as const,
      apply: (items: TeamRow[], q: string) => {
        const lower = q.toLowerCase();
        return items.filter((r) =>
          r.member1NameEn.toLowerCase().includes(lower) ||
          (r.member1NameKo ?? "").toLowerCase().includes(lower) ||
          (r.member2NameEn ?? "").toLowerCase().includes(lower) ||
          (r.member2NameKo ?? "").toLowerCase().includes(lower),
        );
      },
    },
  ];

  return (
    <DatabaseLayout<TeamRow>
      data={teams}
      managedFilters={teamManagedFilters}
      emptyText={p.emptyStateNoTeams}
      rowCountLabel={locale === "ko" ? ["팀", "팀"] : ["team", "teams"]}
      searchAlwaysOpen
    >
      {(filteredTeams: TeamRow[]) => {
        const isCatFiltered = !!teamCatParams.cat;
        const hasGroupData = filteredTeams.some((r) => r.seed);
        const sortedTeams = [...filteredTeams].sort((a, b) => {
          if (!isCatFiltered) {
            const aOrder = categoryMap.get(a.categoryId) ? a.categoryId : "zzz";
            const bOrder = categoryMap.get(b.categoryId) ? b.categoryId : "zzz";
            if (aOrder !== bOrder) return aOrder.localeCompare(bOrder);
          }
          if (hasGroupData) {
            const ga = a.seed ?? ""; const gb = b.seed ?? "";
            if (ga !== gb) return ga.localeCompare(gb);
          }
          return parseInt(a.teamId.match(/(\d+)$/)![1], 10) - parseInt(b.teamId.match(/(\d+)$/)![1], 10);
        });
        const hasDoubles = filteredTeams.some((r) => r.isDoubles);
        return (
          <TableView<TeamRow>
            type="table"
            items={sortedTeams}
            rowGroupBreakBefore={!isCatFiltered ? makeGroupBreakBefore(sortedTeams, (r) => r.categoryId) : undefined}
            columns={[
              {
                header: a.teams.columns.number,
                ...(isCatFiltered
                  ? {
                      sortKey: "number",
                      sortValue: (r: TeamRow) => parseInt(r.teamId.match(/(\d+)$/)![1], 10),
                      renderCell: (r: TeamRow) => ({ type: "number" as const, value: parseInt(r.teamId.match(/(\d+)$/)![1], 10) }),
                    }
                  : {
                      renderCell: (_r: TeamRow, i: number) => ({ type: "number" as const, value: i + 1 }),
                    }),
              },
              ...(!isCatFiltered ? [{
                header: t.shared.labels.category,
                sortKey: "category",
                sortValue: (r: TeamRow) => r.categoryLabel,
                renderCell: (r: TeamRow) => ({ type: "text" as const, value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel }),
              }] : []),
              {
                header: a.teams.columns.player1,
                sortKey: "player1",
                sortValue: (r: TeamRow) => r.member1NameEn,
                renderCell: (r: TeamRow) => ({ type: "text" as const, value: displayName(r.member1NameEn, r.member1NameKo, locale) }),
              },
              ...(hasDoubles ? [{
                header: a.teams.columns.player2,
                sortKey: "player2",
                sortValue: (r: TeamRow) => r.member2NameEn ?? "",
                renderCell: (r: TeamRow) => ({ type: "text" as const, value: r.member2NameEn ? displayName(r.member2NameEn, r.member2NameKo, locale) : null }),
              }] : []),
              ...(hasGroupData ? [{
                header: t.shared.labels.seed,
                sortKey: "seed",
                sortValue: (r: TeamRow) => r.seed ?? "",
                renderCell: (r: TeamRow) => r.seed
                  ? { type: "chips" as const, items: [{ label: r.seed, className: `group-chip-${r.seed.toLowerCase()}` }] }
                  : { type: "text" as const, value: null },
              }] : []),
            ]}
          />
        );
      }}
    </DatabaseLayout>
  );
}
