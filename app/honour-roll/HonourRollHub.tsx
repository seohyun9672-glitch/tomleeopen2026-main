"use client";

import { useMemo } from "react";
import type { CategoryRecord } from "@/lib/categories";
import type { Match } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { DatabaseLayout } from "@/app/components/database";
import { MatchCard } from "@/app/components/MatchCard";

type HonourEntry = { year: number; match: Match };

type Props = {
  categories: CategoryRecord[];
  allMatches: Match[];
};

export function HonourRollHub({ categories, allMatches }: Props) {
  const { t } = useLocale();

  const allYears = useMemo(
    () => [...new Set(allMatches.map((m) => m.tournamentYear))].sort((a, b) => b - a),
    [allMatches],
  );

  // Pre-filter to finals only and reshape once; DatabaseLayout applies year + category filters.
  const allEntries = useMemo(
    (): HonourEntry[] =>
      allMatches
        .filter((m) => m.round?.code === "F")
        .map((m) => ({ year: m.tournamentYear, match: m }))
        .sort((a, b) => b.year - a.year),
    [allMatches],
  );

  return (
    <DatabaseLayout<HonourEntry>
      data={allEntries}
      managedFilters={[
        {
          type: "year" as const,
          param: "year",
          years: allYears,
          apply: (items: HonourEntry[], year: string) =>
            year ? items.filter((e) => String(e.year) === year) : items,
          clearParams: ["cat"],
          allLabel: t.shared.labels.allYears,
          defaultToAll: true,
        },
        {
          type: "category" as const,
          param: "cat",
          // Options are derived from year-filtered entries so the category list
          // updates when the year filter changes.
          options: (yearFiltered: HonourEntry[]) => {
            const ids = new Set(yearFiltered.map((e) => e.match.categoryId));
            return categories
              .filter((c) => ids.has(c.id))
              .map((c) => ({
                id: c.id,
                label: c.label,
                labelKo: c.labelKo,
              }))
              .sort((a, b) =>
                a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
              );
          },
          apply: (items: HonourEntry[], categoryId: string) =>
            categoryId ? items.filter((e) => e.match.categoryId === categoryId) : items,
          autoSelect: true,
        },
      ]}
      view={{
        getKey: (e) => `${e.match.id}-${e.year}`,
        groupBy: (e) => String(e.year),
        renderGroupHeader: (year) => (
          <h3 className="text-[var(--section-text)]">{year}</h3>
        ),
        renderItem: (e) => <MatchCard match={e.match} />,
        headerGap: "gap-[var(--element-gap)]",
        groupGap: "gap-[var(--section-gap)]",
        className: "text-[var(--section-text)]",
      }}
      emptyText={t.emptyStates.noResults}
    />
  );
}
