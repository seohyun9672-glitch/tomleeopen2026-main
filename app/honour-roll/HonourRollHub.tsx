"use client";

import { useEffect, useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/category/categories";
import type { CategoryRecord } from "@/lib/category/categories";
import type { MatchWithTeamNames } from "@/lib/matches";
import { FilterGroup, YearFilter, CategoryFilter, HubContent } from "@/app/components/FilterGroup";
import { useLocale } from "@/lib/locale-context";
import { MatchCard } from "@/app/components/MatchCard";

type HonourEntry = {
  year: number;
  match: MatchWithTeamNames;
};

type Props = {
  categories: CategoryRecord[];
  allYears: number[];
  matchesByYear: Record<number, Record<string, MatchWithTeamNames[]>>;
};

function parseYearFilter(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function HonourRollHub({ categories, allYears, matchesByYear }: Props) {
  const { t, locale } = useLocale();
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const [rawYearFilter, setYearFilter] = useUrlParam("year");
  const [rawCategoryId, setCategoryId] = useUrlParam("cat");

  const selectedYear = useMemo(() => parseYearFilter(rawYearFilter), [rawYearFilter]);

  // Derive champion entries (Final round match) per category per year from raw match data
  const entriesByCategory = useMemo(() => {
    const result: Record<string, HonourEntry[]> = {};
    for (const [yearStr, matchesByCat] of Object.entries(matchesByYear)) {
      const year = Number(yearStr);
      for (const [categoryId, matches] of Object.entries(matchesByCat)) {
        const finalMatch = matches.find((m) => m.round?.code === "F");
        if (!finalMatch) continue;
        if (!result[categoryId]) result[categoryId] = [];
        result[categoryId].push({ year, match: finalMatch });
      }
    }
    for (const entries of Object.values(result)) {
      entries.sort((a, b) => b.year - a.year);
    }
    return result;
  }, [matchesByYear]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => {
        const entries = entriesByCategory[c.id] ?? [];
        if (selectedYear === null) return entries.length > 0;
        return entries.some((e) => e.year === selectedYear);
      })
      .map((c) => ({
        id: c.id,
        label: categoryLabelForId(categoriesById, c.id, locale),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [categories, entriesByCategory, selectedYear, categoriesById, locale]);

  const categoryId = useMemo(() => {
    if (categoryOptions.some((o) => o.id === rawCategoryId)) return rawCategoryId;
    return categoryOptions[0]?.id ?? "";
  }, [rawCategoryId, categoryOptions]);

  useEffect(() => {
    if (rawCategoryId !== categoryId) setCategoryId(categoryId);
  }, [rawCategoryId, categoryId, setCategoryId]);

  const entries = useMemo(() => {
    const base = entriesByCategory[categoryId] ?? [];
    if (selectedYear === null) return base;
    return base.filter((e) => e.year === selectedYear);
  }, [entriesByCategory, categoryId, selectedYear]);

  return (
    <>
      <FilterGroup>
        <YearFilter
          id="honour-roll-year"
          value={rawYearFilter}
          years={allYears}
          onChange={(value) => setYearFilter(value, { clear: ["cat"] })}
          allLabel={t.shared.labels.allYears}
        />
        <CategoryFilter
          id="honour-roll-category"
          value={categoryId}
          options={categoryOptions}
          onChange={setCategoryId}
        />
      </FilterGroup>

      <HubContent isEmpty={entries.length === 0} emptyText={t.emptyStates.noResults}>
        <div className="flex flex-col gap-[var(--section-gap)] text-[var(--section-text)]">
          {entries.map(({ year, match }) => (
            <div key={`${match.id}-${year}`} className="flex min-w-0 flex-col gap-[var(--element-gap)]">
              <h3>{year}</h3>
              <MatchCard match={match} />
            </div>
          ))}
        </div>
      </HubContent>
    </>
  );
}
