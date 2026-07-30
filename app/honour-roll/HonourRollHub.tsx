"use client";

import { useMemo } from "react";
import type { CategoryRecord } from "@/lib/categories";
import {
  buildCategoryByIdMap,
  deriveGroupedCategoryOptions,
} from "@/lib/categories";
import type { Match } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import { TableView } from "@/app/components/ui/table/Table";
import { GroupedList } from "@/app/components/GroupedList";

type HonourEntry = { year: number; match: Match };

type Props = {
  categories: CategoryRecord[];
  allMatches: Match[];
};

export function HonourRollHub({ categories, allMatches }: Props) {
  const { t, locale } = useLocale();
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  // Only finals where a winner has been determined.
  const allEntries = useMemo(
    (): HonourEntry[] =>
      allMatches
        .filter((m) => m.round?.code === "F" && m.winner !== null)
        .map((m) => ({ year: m.tournamentYear, match: m }))
        .sort((a, b) => b.year - a.year),
    [allMatches],
  );

  const championName = (e: HonourEntry) => {
    const winner = e.match.winner;
    return winner === 1
      ? locale === "ko"
        ? e.match.team1DisplayNameKo || e.match.team1DisplayName
        : e.match.team1DisplayName
      : winner === 2
        ? locale === "ko"
          ? e.match.team2DisplayNameKo || e.match.team2DisplayName
          : e.match.team2DisplayName
        : null;
  };

  const runnerUpName = (e: HonourEntry) => {
    const winner = e.match.winner;
    return winner === 1
      ? locale === "ko"
        ? e.match.team2DisplayNameKo || e.match.team2DisplayName
        : e.match.team2DisplayName
      : winner === 2
        ? locale === "ko"
          ? e.match.team1DisplayNameKo || e.match.team1DisplayName
          : e.match.team1DisplayName
        : null;
  };

  // Shared width across every category's table so the champion/runner-up
  // columns line up regardless of which category happens to have the longest name.
  const nameColWidth = useMemo(() => {
    let maxLen = 1;
    for (const e of allEntries) {
      maxLen = Math.max(maxLen, (championName(e) ?? "").length, (runnerUpName(e) ?? "").length);
    }
    return `${maxLen + 1}ch`;
  }, [allEntries, locale]);

  const columns = useMemo(
    () => [
      {
        header: t.year,
        width: "6ch",
        renderCell: (e: HonourEntry) => ({ type: "text" as const, value: String(e.year) }),
      },
      {
        header: t.champion,
        width: nameColWidth,
        renderCell: (e: HonourEntry) => ({ type: "text" as const, value: championName(e) ?? "" }),
      },
      {
        header: t.runnerUp,
        width: nameColWidth,
        renderCell: (e: HonourEntry) => ({ type: "text" as const, value: runnerUpName(e) ?? "" }),
      },
    ],
    [t, locale, nameColWidth],
  );

  return (
    <DatabaseLayout<HonourEntry>
      data={allEntries}
      managedFilters={[
        {
          type: "category" as const,
          param: "cat",
          options: (filtered: HonourEntry[]) =>
            deriveGroupedCategoryOptions(filtered.map((e) => e.match.categoryId), categoriesById),
          apply: (items: HonourEntry[], categoryId: string) =>
            categoryId ? items.filter((e) => e.match.categoryId === categoryId) : items,
          allLabel: t.shared.labels.allCategories,
        },
      ]}
      emptyText={t.emptyStates.noResults}
    >
      {(filteredData) => {
        // Group filtered entries by category, preserving the server's stable
        // sortOrder-based category order (locale-independent).
        const groupMap = new Map<string, HonourEntry[]>();
        for (const entry of filteredData) {
          if (!groupMap.has(entry.match.categoryId)) groupMap.set(entry.match.categoryId, []);
          groupMap.get(entry.match.categoryId)!.push(entry);
        }
        const groups = categories
          .filter((c) => groupMap.has(c.id))
          .map((c) => ({
            categoryId: c.id,
            label: locale === "ko" ? c.labelKo || c.label : c.label,
            entries: groupMap.get(c.id)!,
          }));

        return (
          <GroupedList
            groups={groups.map(({ categoryId, label, entries }) => ({
              key: categoryId,
              label,
              children: <TableView items={entries} type="table" columns={columns} />,
            }))}
          />
        );
      }}
    </DatabaseLayout>
  );
}
