"use client";

import { useLayoutEffect, useMemo, useCallback } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import { categoriesConfirmedForYear } from "@/lib/categories/yearStatus";
import type { CategoryRecord } from "@/lib/categories/types";
import type { CategoryYearListItem } from "@/lib/categories/yearStatus";
import {
  buildDrawStageData,
  computeDefaultDrawStage,
  computeDefaultKnockoutDrawStage,
  isoDateLocal,
  type DrawStage,
} from "@/lib/drawStage";
import type { MatchWithTeamNames } from "@/lib/matches";
import { deriveYearOptions } from "@/lib/filterUtils";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
import { CategoriesDrawPanel } from "@/app/components/tree/CategoriesDrawPanel";

type Props = {
  categories: CategoryRecord[];
  allYears: number[];
  /** Years that actually have match data — used to pick the initial year. */
  yearsWithMatches: number[];
  /** Pre-fetched category-year statuses keyed by year. */
  statusesByYear: Record<number, CategoryYearListItem[]>;
  /** Pre-fetched matches keyed by `year → categoryId`. */
  matchesByYear: Record<number, Record<string, MatchWithTeamNames[]>>;
};

export function DrawsHub({
  categories,
  allYears,
  yearsWithMatches,
  statusesByYear,
  matchesByYear,
}: Props) {
  const { t, locale } = useLocale();

  const thisYear = new Date().getFullYear();
  const fallbackYear = yearsWithMatches[0] ?? thisYear;

  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const year = yearParamNum > 0 && allYears.includes(yearParamNum) ? yearParamNum : fallbackYear;
  const setYear = useCallback((y: number) => setYearParam(String(y), { clear: ["cat", "stage", "group"] }), [setYearParam]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoriesToShow = useMemo(() => {
    const statuses = statusesByYear[year] ?? [];
    return categoriesConfirmedForYear(categories, statuses);
  }, [categories, statusesByYear, year]);

  const [rawCatParam, setCatParam] = useUrlParam("cat");
  const categoryId = categoriesToShow.some(c => c.id === rawCatParam) ? rawCatParam : (categoriesToShow[0]?.id ?? "");
  const setCategoryId = useCallback((id: string) => setCatParam(id, { clear: ["stage", "group"] }), [setCatParam]);

  const yearOptions = useMemo(() => deriveYearOptions(yearsWithMatches), [yearsWithMatches]);

  const categoryOptions = useMemo(
    () =>
      categoriesToShow.map((c) => ({
        id: c.id,
        label: categoryLabelForId(categoriesById, c.id, locale),
      })),
    [categoriesToShow, categoriesById, locale]
  );

  const categoryMatches = useMemo(
    () => matchesByYear[year]?.[categoryId] ?? [],
    [matchesByYear, year, categoryId]
  );

  const drawData = useMemo(() => buildDrawStageData(categoryMatches), [categoryMatches]);

  const showDesktopDrawStageSelect =
    !drawData.isUnifiedKnockout &&
    drawData.availableStages.length > 0 &&
    (categoryMatches.length > 0 || drawData.hasPrelims);

  const VALID_STAGES: DrawStage[] = ["prelims", "qf", "sf", "final"];
  const [stageParam, setStageParam] = useUrlParam("stage");
  const drawStage: DrawStage = (() => {
    const parsed = VALID_STAGES.includes(stageParam as DrawStage) ? (stageParam as DrawStage) : null;
    const defaultStage = computeDefaultDrawStage(drawData, isoDateLocal());
    // Unified knockout has no prelims view — never land on "prelims" for those categories.
    if ((parsed ?? defaultStage) === "prelims" && drawData.isUnifiedKnockout) return defaultStage;
    return parsed ?? defaultStage;
  })();
  const setDrawStage = useCallback((s: DrawStage) => setStageParam(s), [setStageParam]);

  // On mount: write the active stage to the URL so language toggles can preserve it.
  // Only runs once — year/category changes reset via setYear/setCategoryId clearing "stage".
  useLayoutEffect(() => {
    if (!VALID_STAGES.includes(stageParam as DrawStage) || (stageParam === "prelims" && drawData.isUnifiedKnockout)) {
      setStageParam(computeDefaultDrawStage(drawData, isoDateLocal()));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex flex-col gap-[var(--content-gap)] md:gap-[var(--content-gap)]">
      <div className="w-full min-w-0">
        <FilterGroup>
          <Filter control="year" htmlFor="draws-year" label={t.shared.labels.year}>
            <Filter.Select
              id="draws-year"
              value={String(year)}
              onChange={(e) => {
                setYear(Number(e.currentTarget.value));
                e.currentTarget.blur();
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Filter.Select>
          </Filter>
          <Filter control="stretch" htmlFor="draws-category" label={t.shared.labels.category}>
            <Filter.Select
              id="draws-category"
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
          {showDesktopDrawStageSelect ? (
            <div className="hidden md:contents">
              <Filter control="stretch" htmlFor="draws-draw-stage" label={t.drawsPage.drawStageLabel}>
                <Filter.Select
                  id="draws-draw-stage"
                  value={drawStage === "prelims" ? "prelims" : "knockout"}
                  onChange={(e) => {
                    const next = e.currentTarget.value;
                    if (next === "prelims") {
                      setDrawStage("prelims");
                    } else {
                      const nextStage = computeDefaultKnockoutDrawStage(drawData, isoDateLocal());
                      if (nextStage) setDrawStage(nextStage);
                    }
                    e.currentTarget.blur();
                  }}
                  aria-label={t.drawsPage.drawStageLabel}
                >
                  {drawData.hasPrelims ? <option value="prelims">{(() => { const r = drawData.prelimMatches[0]?.round; return r ? (locale === "ko" ? r.labelKo : r.labelEn) : (locale === "ko" ? "예선" : "Preliminaries"); })()}</option> : null}
                  {drawData.hasKnockout ? (
                    <option value="knockout">{t.drawsPage.drawStageFinalsBracket}</option>
                  ) : null}
                </Filter.Select>
              </Filter>
            </div>
          ) : null}
        </FilterGroup>
      </div>

      <div className="w-full pb-6 md:pb-8">
        {/* key resets CategoriesDrawPanel local state when year/category changes */}
        <CategoriesDrawPanel
          key={`${year}-${categoryId}`}
          drawTeams={[]}
          categoryMatches={categoryMatches}
          drawData={drawData}
          drawStage={drawStage}
          setDrawStage={setDrawStage}
        />
      </div>
    </section>
  );
}
