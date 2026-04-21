"use client";

import { useEffect, useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  isCategoryConfirmedForYear,
} from "@/lib/categories";
import type { CategoryRecord, CategoryYearListItem } from "@/lib/categories";
import type { HonourRollEntry } from "@/lib/matches";
import {
  YearFilter,
  CategoryFilter,
} from "@/app/components/FilterControls";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { MatchCard } from "@/app/components/MatchCard";

type Props = {
  categories: CategoryRecord[];
  allYears: number[];
  honourRollByCategory: Record<string, HonourRollEntry[]>;
  statusesByYear: Record<number, CategoryYearListItem[]>;
};

type CategoryOption = {
  id: string;
  label: string;
};

function parseYearFilter(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasConfirmedEntries(
  categoryId: string,
  entries: HonourRollEntry[],
  statusesByYear: Record<number, CategoryYearListItem[]>,
  year: number | null
): boolean {
  if (year === null) {
    return entries.some((entry) =>
      isCategoryConfirmedForYear(categoryId, statusesByYear[entry.year] ?? [])
    );
  }

  return (
    entries.some((entry) => entry.year === year) &&
    isCategoryConfirmedForYear(categoryId, statusesByYear[year] ?? [])
  );
}

function getValidCategoryId(rawCategoryId: string, options: CategoryOption[]): string {
  if (options.some((option) => option.id === rawCategoryId)) {
    return rawCategoryId;
  }
  return options[0]?.id ?? "";
}

export function HonourRollHub({
  categories,
  allYears,
  honourRollByCategory,
  statusesByYear,
}: Props) {
  const { t, locale } = useLocale();
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const [rawYearFilter, setYearFilter] = useUrlParam("year");
  const [rawCategoryId, setCategoryId] = useUrlParam("cat");

  const selectedYear = useMemo(() => parseYearFilter(rawYearFilter), [rawYearFilter]);

  const categoriesWithHonour = useMemo(() => {
    return categories.filter(
      (category) => (honourRollByCategory[category.id]?.length ?? 0) > 0
    );
  }, [categories, honourRollByCategory]);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    return categoriesWithHonour
      .filter((category) =>
        hasConfirmedEntries(
          category.id,
          honourRollByCategory[category.id] ?? [],
          statusesByYear,
          selectedYear
        )
      )
      .map((category) => ({
        id: category.id,
        label: categoryLabelForId(categoriesById, category.id, locale),
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );
  }, [
    categoriesWithHonour,
    honourRollByCategory,
    statusesByYear,
    selectedYear,
    categoriesById,
    locale,
  ]);

  const categoryId = useMemo(() => {
    return getValidCategoryId(rawCategoryId, categoryOptions);
  }, [rawCategoryId, categoryOptions]);

  useEffect(() => {
    if (rawCategoryId !== categoryId) {
      setCategoryId(categoryId);
    }
  }, [rawCategoryId, categoryId, setCategoryId]);

  const entries = useMemo(() => {
    const base = honourRollByCategory[categoryId] ?? [];

    if (selectedYear === null) {
      return base;
    }

    return base.filter((entry) => entry.year === selectedYear);
  }, [honourRollByCategory, categoryId, selectedYear]);

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
          control="stretch"
        />
      </FilterGroup>

      <div className="mt-[var(--content-gap)] text-[var(--section-text)] md:mt-[var(--section-gap)]">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
            {t.empty}
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--section-gap)]">
            {entries.map(({ year, match }) => (
              <div
                key={`${match.id}-${year}`}
                className="flex min-w-0 flex-col gap-[var(--element-gap)]"
              >
                <h3>{year}</h3>
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}