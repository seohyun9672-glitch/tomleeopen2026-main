"use client";

import { useCallback, useLayoutEffect, useMemo } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories";
import type { CategoryRecord, CategoryYearListItem } from "@/lib/categories";
import {
  buildDrawStageData,
  buildPrelimRankMap,
  computeDefaultDrawStage,
  computeDefaultKnockoutDrawStage,
  isoDateLocal,
  knockoutSubStageFromDrawStage,
  DRAW_STAGE_ORDER,
  type DrawStage,
} from "@/lib/draws";
import type { MatchWithTeamNames } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import {
  deriveCategoriesForYear,
  YearFilter,
  CategoryFilter,
  RoundFilter,
  GroupFilter,
} from "@/app/components/FilterControls";
import { BracketView } from "@/app/components/tree/BracketView";
import { StageHeader } from "@/app/components/tree/StageHeader";
import { PrelimsLeaderboard } from "./PrelimsLeaderboard";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  categories: CategoryRecord[];
  allYears: number[];
  yearsWithMatches: number[];
  statusesByYear: Record<number, CategoryYearListItem[]>;
  matchesByYear: Record<number, Record<string, MatchWithTeamNames[]>>;
};

const VALID_STAGES: DrawStage[] = ["pre", "r16", "qf", "sf", "final"];

// ─── Data derivation ──────────────────────────────────────────────────────────

function useDrawsState({
  categories,
  allYears,
  yearsWithMatches,
  statusesByYear,
  matchesByYear,
}: Props) {
  const { locale } = useLocale();
  const today = isoDateLocal();

  // Year
  const fallbackYear = yearsWithMatches[0] ?? new Date().getFullYear();
  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const year =
    yearParamNum > 0 && allYears.includes(yearParamNum) ? yearParamNum : fallbackYear;
  const setYear = useCallback(
    (y: number) => setYearParam(String(y), { clear: ["stage", "group"] }),
    [setYearParam],
  );

  // Category
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);
  const categoriesToShow = useMemo(
    () => deriveCategoriesForYear(categories, statusesByYear, year),
    [categories, statusesByYear, year],
  );
  const [rawCatParam, setCatParam] = useUrlParam("cat");
  const categoryId = categoriesToShow.some((c) => c.id === rawCatParam)
    ? rawCatParam
    : (categoriesToShow[0]?.id ?? "");
  const setCategoryId = useCallback(
    (id: string) => setCatParam(id),
    [setCatParam],
  );
  const categoryOptions = useMemo(
    () =>
      categoriesToShow.map((c) => ({
        id: c.id,
        label: categoryLabelForId(categoriesById, c.id, locale),
      })),
    [categoriesToShow, categoriesById, locale],
  );

  // Match data → draw stage breakdown
  const categoryMatches = useMemo(
    () => matchesByYear[year]?.[categoryId] ?? [],
    [matchesByYear, year, categoryId],
  );
  const drawData = useMemo(() => buildDrawStageData(categoryMatches), [categoryMatches]);
  const defaultStage = computeDefaultDrawStage(drawData, today);

  const {
    availableStages,
    availableKnockoutStages,
    knockoutSubStages,
    prelimMatches,
    r16Matches,
    qfMatches,
    sfMatches,
    finalMatches,
    hasPre,
    hasKnockout,
  } = drawData;

  // Stage (validated; falls back to latest started or first available)
  const [stageParam, setStageParam] = useUrlParam("stage");
  const drawStage: DrawStage = useMemo(() => {
    const parsed = VALID_STAGES.includes(stageParam as DrawStage)
      ? (stageParam as DrawStage)
      : null;
    const resolved = parsed ?? defaultStage;
    if (resolved === "pre" && !hasPre)
      return availableKnockoutStages[availableKnockoutStages.length - 1] ?? "r16";
    return resolved;
  }, [stageParam, defaultStage, hasPre, availableKnockoutStages]);

  const setDrawStage = useCallback(
    (s: DrawStage) => setStageParam(s, { clear: ["group"] }),
    [setStageParam],
  );

  // Write a valid stage to the URL on mount so locale toggles can preserve it.
  useLayoutEffect(() => {
    const parsed = VALID_STAGES.includes(stageParam as DrawStage)
      ? (stageParam as DrawStage)
      : null;
    if (!parsed || (parsed === "pre" && !hasPre)) {
      setStageParam(defaultStage);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Group filter (pre stage only) — derived from team seed values on prelim matches
  const [rawGroupParam, setGroupParam] = useUrlParam("group");
  const prelimGroupOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const m of prelimMatches) {
      if (m.team1Seed?.trim()) seen.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) seen.add(m.team2Seed.trim());
    }
    return [...seen].sort();
  }, [prelimMatches]);
  // Default to first group when param is absent or invalid — no "all" state
  const activeGroup = prelimGroupOptions.includes(rawGroupParam ?? "")
    ? (rawGroupParam ?? "")
    : (prelimGroupOptions[0] ?? "");

  // Team rank map — computed from prelim matches, always available regardless of active stage
  const teamRankById = useMemo(() => buildPrelimRankMap(categoryMatches), [categoryMatches]);

  // Active bracket column (which knockout round is visible on mobile)
  const activeKnockoutColumn = useMemo(() => {
    const sub = knockoutSubStageFromDrawStage(drawStage);
    if (sub && knockoutSubStages.includes(sub)) return sub;
    return knockoutSubStages[0] ?? "r16";
  }, [drawStage, knockoutSubStages]);

  // Ordered stages for mobile navigator (pre → r16 → qf → sf → final, only those with matches)
  const orderedDrawStages = useMemo(
    () => DRAW_STAGE_ORDER.filter((s) => availableStages.includes(s)),
    [availableStages],
  );
  const stageNavIndex = orderedDrawStages.indexOf(drawStage);
  const mobilePrevStage = stageNavIndex > 0 ? orderedDrawStages[stageNavIndex - 1] : null;
  const mobileNextStage =
    stageNavIndex >= 0 && stageNavIndex < orderedDrawStages.length - 1
      ? orderedDrawStages[stageNavIndex + 1]
      : null;

  return {
    year, setYear,
    categoryId, setCategoryId, categoryOptions,
    drawStage, setDrawStage,
    drawData,
    activeGroup, setGroupParam, prelimGroupOptions,
    teamRankById,
    activeKnockoutColumn,
    orderedDrawStages, mobilePrevStage, mobileNextStage,
    hasPre, hasKnockout,
    prelimMatches, r16Matches, qfMatches, sfMatches, finalMatches,
    categoryMatches,
    availableKnockoutStages,
    knockoutSubStages,
    today,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawsHub(props: Props) {
  const { yearsWithMatches } = props;
  const { t, locale } = useLocale();

  const {
    year, setYear,
    categoryId, setCategoryId, categoryOptions,
    drawStage, setDrawStage,
    drawData,
    activeGroup, setGroupParam, prelimGroupOptions,
    teamRankById,
    activeKnockoutColumn,
    orderedDrawStages, mobilePrevStage, mobileNextStage,
    hasPre, hasKnockout,
    r16Matches, qfMatches, sfMatches, finalMatches, prelimMatches,
    categoryMatches,
    availableKnockoutStages,
    knockoutSubStages,
    today,
  } = useDrawsState(props);

  // ── Render flags ────────────────────────────────────────────────────────────

  const showPreSection = drawStage === "pre";
  const showKnockoutSection = drawStage !== "pre";
  const showMobileStageNav = orderedDrawStages.length > 1;
  const showDesktopRoundFilter = hasPre || hasKnockout;
  const showGroupFilter = showPreSection && prelimGroupOptions.length > 0;

  // ── Round filter options (desktop): Preliminaries / Finals ─────────────────

  const roundFilterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (hasPre) {
      const round = prelimMatches[0]?.round;
      const label = round
        ? (locale === "ko" ? round.labelKo : round.labelEn)
        : (locale === "ko" ? "예선" : "Preliminaries");
      opts.push({ value: "pre", label });
    }
    if (hasKnockout) {
      opts.push({ value: "knockout", label: t.drawsPage.drawStageFinalsBracket });
    }
    return opts;
  }, [hasPre, hasKnockout, prelimMatches, locale, t.drawsPage.drawStageFinalsBracket]);

  const roundFilterValue = showPreSection ? "pre" : "knockout";

  const handleRoundChange = useCallback(
    (value: string) => {
      if (value === "pre") {
        setDrawStage("pre");
      } else {
        const next = computeDefaultKnockoutDrawStage(drawData, today);
        if (next) {
          setDrawStage(next);
        } else {
          const target = availableKnockoutStages[availableKnockoutStages.length - 1];
          if (target) setDrawStage(target);
        }
      }
    },
    [setDrawStage, drawData, today, availableKnockoutStages],
  );

  // ── Stage title (mobile navigator header) ───────────────────────────────────

  const stageTitle = useMemo(() => {
    const byStage: Partial<Record<DrawStage, MatchWithTeamNames[]>> = {
      pre: prelimMatches,
      r16: r16Matches,
      qf: qfMatches,
      sf: sfMatches,
      final: finalMatches,
    };
    const round = (byStage[drawStage] ?? [])[0]?.round;
    if (round) return locale === "ko" ? round.labelKo : round.labelEn;
    const fallbacks: Record<DrawStage, string> = {
      pre: locale === "ko" ? "예선" : "Preliminaries",
      r16: locale === "ko" ? "16강" : "Round of 16",
      qf: locale === "ko" ? "8강" : "Quarterfinals",
      sf: locale === "ko" ? "4강" : "Semifinals",
      final: locale === "ko" ? "결승" : "Final",
    };
    return fallbacks[drawStage];
  }, [drawStage, prelimMatches, r16Matches, qfMatches, sfMatches, finalMatches, locale]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-[var(--content-gap)]">
      {/* Filters */}
      <div className="w-full min-w-0">
        <FilterGroup>
          <YearFilter
            id="draws-year"
            value={String(year)}
            years={yearsWithMatches}
            onChange={(v) => setYear(Number(v))}
          />

          <CategoryFilter
            id="draws-category"
            value={categoryId}
            options={categoryOptions}
            onChange={setCategoryId}
            control="stretch"
          />

          {/* Round toggle: desktop only */}
          {showDesktopRoundFilter && (
            <div className="hidden md:contents">
              <RoundFilter
                id="draws-round"
                value={roundFilterValue}
                options={roundFilterOptions}
                onChange={handleRoundChange}
              />
            </div>
          )}

          {/* Group filter: prelims only, when groups exist */}
          {showGroupFilter && (
            <GroupFilter
              id="draws-group"
              value={activeGroup}
              options={prelimGroupOptions}
              onChange={setGroupParam}
            />
          )}
        </FilterGroup>
      </div>

      {/* Content */}
      <div className="w-full pb-6 md:pb-8">
        <div className="space-y-[var(--content-gap)] text-[var(--section-text)] md:space-y-[var(--section-gap)]">
          {/* Stage navigator: mobile only */}
          {showMobileStageNav && (
            <div className="md:hidden">
              <StageHeader
                title={stageTitle}
                navigation={{
                  onPrev: () => { if (mobilePrevStage) setDrawStage(mobilePrevStage); },
                  onNext: () => { if (mobileNextStage) setDrawStage(mobileNextStage); },
                  prevDisabled: mobilePrevStage == null,
                  nextDisabled: mobileNextStage == null,
                  prevLabel: t.drawsPage.bracketPrevRound,
                  nextLabel: t.drawsPage.bracketNextRound,
                }}
              />
            </div>
          )}

          {/* Prelim board */}
          {showPreSection && hasPre && (
            <PrelimsLeaderboard
              categoryMatches={categoryMatches}
              selectedGroup={activeGroup}
            />
          )}

          {/* Knockout bracket */}
          {showKnockoutSection && (
            knockoutSubStages.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {t.drawsPage.drawNoMatches}
              </p>
            ) : (
              <BracketView
                r16Matches={r16Matches}
                qfMatches={qfMatches}
                sfMatches={sfMatches}
                finalMatches={finalMatches}
                teamRankById={teamRankById}
                activeKnockoutColumn={activeKnockoutColumn}
                suppressMobileRoundTitle={showMobileStageNav}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
