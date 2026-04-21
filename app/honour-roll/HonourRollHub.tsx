"use client";

import { useLayoutEffect, useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";
import { isCategoryConfirmedForYear, type CategoryYearListItem } from "@/lib/categories";
import type { HonourRollEntry } from "@/lib/matches";
import { filterByValue, YearFilter, CategoryFilter } from "@/app/components/FilterControls";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { MatchCard } from "@/app/components/MatchCard";

type Props = {
  categories: CategoryRecord[];
  allYears: number[];
  honourRollByCategory: Record<string, HonourRollEntry[]>;
  statusesByYear: Record<number, CategoryYearListItem[]>;
};

export function HonourRollHub({
  categories,
  allYears,
  honourRollByCategory,
  statusesByYear,
}: Props) {
  const { t, locale } = useLocale();
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoriesWithHonour = useMemo(
    () => categories.filter((c) => (honourRollByCategory[c.id]?.length ?? 0) > 0),
    [categories, honourRollByCategory]
  );

  const [yearFilter, setYearFilter] = useUrlParam("year");
  const [rawCatParam, setCategoryId] = useUrlParam("cat");

  const categoryOptions = useMemo(() => {
    return categoriesWithHonour
      .filter((c) => {
        const entries = honourRollByCategory[c.id] ?? [];
        if (!yearFilter) {
          return entries.some((e) => isCategoryConfirmedForYear(c.id, statusesByYear[e.year] ?? []));
        }
        const y = Number(yearFilter);
        if (!Number.isFinite(y)) return false;
        return (
          entries.some((e) => e.year === y) &&
          isCategoryConfirmedForYear(c.id, statusesByYear[y] ?? [])
        );
      })
      .map((c) => ({ id: c.id, label: categoryLabelForId(categoriesById, c.id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [categoriesWithHonour, honourRollByCategory, yearFilter, statusesByYear, categoriesById, locale]);

  const categoryId = categoryOptions.some((c) => c.id === rawCatParam)
    ? rawCatParam
    : (categoryOptions[0]?.id ?? "");

  // When the validated category would differ from the URL param, sync the URL.
  useLayoutEffect(() => {
    if (rawCatParam !== categoryId) setCategoryId(categoryId);
  }, [categoryId, rawCatParam, setCategoryId]);

  const entries = useMemo(() => {
    const base = honourRollByCategory[categoryId] ?? [];
    return filterByValue(base, (e) => e.year, yearFilter);
  }, [honourRollByCategory, categoryId, yearFilter]);

  return (
    <>
      <FilterGroup>
        <YearFilter
          id="honour-roll-year"
          value={yearFilter}
          years={allYears}
          onChange={(v) => setYearFilter(v, { clear: ["cat"] })}
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

      <div className="mt-[var(--content-gap)] md:mt-[var(--section-gap)] text-[var(--section-text)]">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-[var(--color-text-tertiary)] text-sm">
            {t.empty}
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--section-gap)]">
            {entries.map(({ year, match }) => (
              <div key={`${match.id}-${year}`} className="flex min-w-0 flex-col gap-[var(--element-gap)]">
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
