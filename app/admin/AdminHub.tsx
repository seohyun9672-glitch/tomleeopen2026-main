"use client";

import { useMemo, useCallback } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { useTabParam } from "@/lib/hooks/useTabParam";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { YearFilter, CategoryFilter, RoundFilter, SeedFilter, StatusFilter } from "@/app/components/FilterControls";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  isCategoryConfirmedInYearMap,
  CATEGORY_YEAR_STATUSES,
} from "@/lib/cateogry/categories";
import { TabList } from "@/app/components/ui/TabList";
import { Table } from "@/app/components/ui/table/Table";
import { RegistrationsTable } from "../tables/RegistrationsTable";
import { CategoryStatusTable } from "../tables/CategoryStatusTable";
import { MatchesTable } from "../tables/MatchesTable";
import { PlayersTable } from "../tables/PlayersTable";
import { useLocale } from "@/lib/locale-context";
import type { RoundInfo } from "@/lib/matches";
import type { CategoryRecord, CategoryYearListItem, CategoryYearStatus, CategoryParticipation } from "@/lib/cateogry/categories";
import type { RegistrationRow } from "../tables/RegistrationsTable";
import type { PlayerTableRow } from "../tables/PlayersTable";
import type { MatchWithTeamNames } from "@/lib/matches";

export type YearData = {
  registrations: RegistrationRow[];
  matches: MatchWithTeamNames[];
  categoryStatusItems: CategoryYearListItem[];
  categoryStatusById: Record<string, CategoryYearStatus>;
  categoryParticipation: Record<string, CategoryParticipation>;
};

type AdminView = "registrations" | "categories" | "matches" | "players" | "users";

type Props = {
  yearDataByYear: Record<number, YearData>;
  allYears: number[];
  categories: CategoryRecord[];
  players: PlayerTableRow[];
  adminUsers: { id: string; email: string; createdAt: string }[];
};

const emptyYearData: YearData = {
  registrations: [],
  matches: [],
  categoryStatusItems: [],
  categoryStatusById: {},
  categoryParticipation: {},
};

export function AdminHub({
  yearDataByYear,
  allYears,
  categories,
  players,
  adminUsers,
}: Props) {
  const { t, locale } = useLocale();

  const viewTabs = [
    { value: "registrations" as const, label: t.adminPage.hubTabRegistrations },
    { value: "categories" as const, label: t.adminPage.hubTabCategories },
    { value: "players" as const, label: t.adminPage.hubTabPlayers },
    { value: "users" as const, label: t.adminPage.hubTabUsers },
    { value: "matches" as const, label: t.adminMatches.title },
  ];

  const [view, setView] = useTabParam(viewTabs, ["cat", "status", "round", "seed", "club", "group"]);

  // Year — derived from URL param; prefers the current calendar year when no valid param
  // is present (same logic as the schedule page).
  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const thisYear = new Date().getFullYear();
  const year = yearParamNum > 0 && allYears.includes(yearParamNum)
    ? yearParamNum
    : allYears.includes(thisYear) ? thisYear : (allYears[0] ?? thisYear);
  const setYear = useCallback(
    (y: number) => setYearParam(String(y), { clear: ["cat", "round", "seed"] }),
    [setYearParam]
  );

  const yearData = yearDataByYear[year] ?? emptyYearData;

  const [rawCatParam, setCatFilter] = useUrlParam("cat");
  const [rawRoundParam, setRoundFilter] = useUrlParam("round");
  const [rawSeedParam, setSeedFilter] = useUrlParam("seed");
  const [rawClubParam, setClubFilter] = useUrlParam("club");

  const [rawStatusParam, setStatusParam] = useUrlParam("status");
  const categoryStatusFilter: CategoryYearStatus | "all" = CATEGORY_YEAR_STATUSES.includes(rawStatusParam as CategoryYearStatus) ? rawStatusParam as CategoryYearStatus : "all";
  const setCategoryStatusFilter = useCallback(
    (v: CategoryYearStatus | "all") => setStatusParam(v === "all" ? "" : v),
    [setStatusParam]
  );

  const showYearFilter = view !== "players" && view !== "users";

  const hasCategoryParticipation = Object.values(yearData.categoryParticipation).some(
    (p) => p.players > 0 || p.teams > 0
  );

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const registrationCategoryOptions = useMemo(() => {
    const ids = [...new Set(yearData.registrations.map((r) => r.category).filter(Boolean))].filter((id) =>
      isCategoryConfirmedInYearMap(id, yearData.categoryStatusById)
    );
    return ids
      .map((id) => ({ id, label: categoryLabelForId(categoriesById, id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [yearData.registrations, categoriesById, locale, yearData.categoryStatusById]);

  const matchesCategoryOptions = useMemo(() => {
    const ids = [...new Set(yearData.matches.map((m) => m.categoryId).filter(Boolean))].filter((id) =>
      isCategoryConfirmedInYearMap(id, yearData.categoryStatusById)
    );
    return ids
      .map((id) => ({ id, label: categoryLabelForId(categoriesById, id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [yearData.matches, categoriesById, locale, yearData.categoryStatusById]);

  const categoryStatusFilterOptions = useMemo(
    () =>
      [
        { value: "all" as const, label: t.shared.labels.allYears },
        { value: "Pending" as const, label: t.adminCategoryYears.statusPending },
        { value: "Active" as const, label: t.adminCategoryYears.statusActive },
        { value: "Inactive" as const, label: t.adminCategoryYears.statusInactive },
      ],
    [t]
  );

  // Build round filter options: deduplicate by code, sort newest-first (descending sortOrder).
  const matchesRoundOptions = useMemo(() => {
    const catFiltered = rawCatParam
      ? yearData.matches.filter((m) => m.categoryId === rawCatParam)
      : yearData.matches;
    const roundMap = new Map<string, RoundInfo>();
    for (const m of catFiltered) {
      if (m.round && !roundMap.has(m.round.code)) roundMap.set(m.round.code, m.round);
    }
    const rounds = [...roundMap.values()].sort((a, b) => b.sortOrder - a.sortOrder);
    return rounds.map((r) => ({
      value: r.code,
      label: locale === "ko" ? r.labelKo : r.labelEn,
    }));
  }, [yearData.matches, rawCatParam, locale]);

  const matchesSeedOptions = useMemo(() => {
    if (!rawRoundParam) return [];
    const catFiltered = rawCatParam
      ? yearData.matches.filter((m) => m.categoryId === rawCatParam)
      : yearData.matches;
    const roundFiltered = catFiltered.filter((m) => m.round?.code === rawRoundParam);
    const seeds = new Set<string>();
    roundFiltered.forEach((m) => {
      if (m.team1Seed?.trim()) seeds.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) seeds.add(m.team2Seed.trim());
    });
    return [...seeds].sort().map((s) => ({ value: s, label: s }));
  }, [yearData.matches, rawCatParam, rawRoundParam]);

  const regCategoryFilter = view === "registrations" && registrationCategoryOptions.some(o => o.id === rawCatParam) ? rawCatParam : "";
  const matchesCategoryFilter = view === "matches" && matchesCategoryOptions.some(o => o.id === rawCatParam) ? rawCatParam : "";
  const matchesRoundFilter = view === "matches" && matchesRoundOptions.some(o => o.value === rawRoundParam) ? rawRoundParam : "";
  const matchesSeedFilter = view === "matches" && matchesRoundFilter && matchesSeedOptions.some(o => o.value === rawSeedParam) ? rawSeedParam : "";
  const playersClubFilter = view === "players" ? rawClubParam : "";

  const showRegCategoryFilter = view === "registrations" && registrationCategoryOptions.length > 1;
  const showMatchesCategoryFilter = view === "matches" && matchesCategoryOptions.length > 1;
  const showMatchesRoundFilter = view === "matches" && matchesRoundOptions.length > 1;
  const showMatchesSeedFilter = view === "matches" && !!matchesRoundFilter && matchesSeedOptions.length > 1;
  const showCategoryStatusFilter = view === "categories" && hasCategoryParticipation;
  const showAdminFilterBar =
    showYearFilter || showRegCategoryFilter || showMatchesCategoryFilter || showMatchesRoundFilter || showMatchesSeedFilter || showCategoryStatusFilter;

  return (
    <section className="flex flex-col gap-[var(--content-gap)] md:gap-[var(--content-gap)]">
      <div className="flex w-full flex-col gap-[var(--section-gap)]">
        <div className="w-full">
          <TabList
            tabs={viewTabs}
            value={view}
            onSelect={(v) => setView(v as AdminView)}
            variant="inline"
            dividerClassName="bg-[color:var(--color-border-ui)]"
            className="mb-0"
          />
        </div>
        {showAdminFilterBar ? (
          <div className="w-full min-w-0">
            <FilterGroup>
              {showYearFilter ? (
                <YearFilter
                  id="admin-year"
                  value={String(year)}
                  years={allYears}
                  onChange={(v) => setYear(Number(v))}
                />
              ) : null}
              {showRegCategoryFilter ? (
                <CategoryFilter
                  id="admin-registrations-category"
                  value={regCategoryFilter}
                  options={registrationCategoryOptions}
                  onChange={setCatFilter}
                  allLabel={t.shared.labels.allCategories}
                />
              ) : null}
              {showMatchesCategoryFilter ? (
                <CategoryFilter
                  id="admin-matches-category"
                  value={matchesCategoryFilter}
                  options={matchesCategoryOptions}
                  onChange={setCatFilter}
                  control="stretch"
                  allLabel={t.shared.labels.allCategories}
                />
              ) : null}
              {showMatchesRoundFilter ? (
                <RoundFilter
                  id="admin-matches-round"
                  value={matchesRoundFilter}
                  options={matchesRoundOptions}
                  onChange={(v) => setRoundFilter(v, { clear: ["seed"] })}
                  allLabel={t.shared.labels.allRounds}
                />
              ) : null}
              {showMatchesSeedFilter ? (
                <SeedFilter
                  id="admin-matches-seed"
                  value={matchesSeedFilter}
                  options={matchesSeedOptions.map((s) => s.value)}
                  onChange={setSeedFilter}
                  allLabel={t.shared.labels.allSeeds}
                />
              ) : null}
              {showCategoryStatusFilter ? (
                <StatusFilter
                  id="admin-category-status-filter"
                  label={t.adminCategoryYears.tableStatus}
                  value={categoryStatusFilter}
                  options={categoryStatusFilterOptions}
                  onChange={(v) => setCategoryStatusFilter(v as CategoryYearStatus | "all")}
                />
              ) : null}
            </FilterGroup>
          </div>
        ) : null}
      </div>
      <div className="w-full">
        {view === "registrations" && (
          <section>
            <RegistrationsTable
              initial={yearData.registrations}
              categories={categories}
              year={year}
              categoryStatusById={yearData.categoryStatusById}
              categoryFilter={regCategoryFilter}
              onCategoryFilterChange={setCatFilter}
            />
          </section>
        )}
        {view === "categories" && hasCategoryParticipation && (
          <section>
            <CategoryStatusTable
              categories={categories}
              year={year}
              initialItems={yearData.categoryStatusItems}
              participationByCategory={yearData.categoryParticipation}
              registrations={yearData.registrations}
              statusFilter={categoryStatusFilter}
              onStatusFilterChange={setCategoryStatusFilter}
            />
          </section>
        )}
        {view === "players" && (
          <section>
            <PlayersTable
              rows={players}
              mode="admin"
              showClubFilter
              enableAdminEditor
              emptyNoRowsText="No players in the database yet."
              emptyNoMatchText={t.adminPlayers.noSearchResults}
              showCount
              clubFilter={playersClubFilter}
              onClubFilterChange={setClubFilter}
            />
          </section>
        )}
        {view === "users" && (
          <section>
            <Table
              variant="data"
              headers={["Email", "Created"]}
              dataRows={adminUsers.map((u) => [u.email, u.createdAt.slice(0, 10)])}
            />
            <div className="mt-2 flex w-full justify-end">
              <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
                Total: {adminUsers.length}
              </p>
            </div>
          </section>
        )}
        {view === "matches" && (
          <section>
            <MatchesTable
              year={year}
              categories={categories}
              matches={yearData.matches}
              categoryStatusById={yearData.categoryStatusById}
              categoryFilter={matchesCategoryFilter}
              onCategoryFilterChange={setCatFilter}
              roundFilter={matchesRoundFilter}
              onRoundFilterChange={setRoundFilter}
              seedFilter={matchesSeedFilter}
              onSeedFilterChange={setSeedFilter}
            />
          </section>
        )}
      </div>
    </section>
  );
}
