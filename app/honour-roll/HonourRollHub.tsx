"use client";

import { useLayoutEffect, useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import type { CategoryRecord } from "@/lib/categories/types";
import { isCategoryConfirmedForYear, type CategoryYearListItem } from "@/lib/categories/yearStatus";
import type { HonourRollEntry } from "@/lib/matches";
import { deriveYearOptions, filterByValue } from "@/lib/filterUtils";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
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

  const yearOptions = useMemo(() => deriveYearOptions(allYears).map(String), [allYears]);

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
        <Filter control="year" htmlFor="honour-roll-year" label={t.shared.labels.year}>
          <Filter.Select
            id="honour-roll-year"
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.currentTarget.value, { clear: ["cat"] });
              e.currentTarget.blur();
            }}
          >
            <option value="">{t.shared.labels.allYears}</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Filter.Select>
        </Filter>
        <Filter control="stretch" htmlFor="honour-roll-category" label={t.shared.labels.category}>
          <Filter.Select
            id="honour-roll-category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.currentTarget.value);
              e.currentTarget.blur();
            }}
          >
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Filter.Select>
        </Filter>
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
