"use client";

import { useMemo, useCallback, useState, type ComponentProps } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { useTabParam } from "@/lib/hooks/useTabParam";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { YearFilter, CategoryFilter, RoundFilter, GroupFilter, StatusFilter, ClubFilter } from "@/app/components/FilterControls";
import { SearchBox } from "@/app/components/ui/SearchBox";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  isCategoryConfirmedInYearMap,
  CATEGORY_YEAR_STATUSES,
} from "@/lib/category/categories";
import { TabList } from "@/app/components/ui/TabList";
import { RegistrationsTable } from "../../tables/RegistrationsTable";
import { CategoryStatusTable } from "../../tables/CategoryStatusTable";
import { MatchesTable } from "../../tables/MatchesTable";
import { PlayersTable } from "../../tables/PlayersTable";
import { AdminUsersTable } from "../../tables/AdminUsersTable";
import { useLocale } from "@/lib/locale-context";
import type { RoundInfo } from "@/lib/matches";
import { categoryYearStatusLabel } from "@/lib/category/categories";
import type { CategoryRecord, CategoryYearListItem, CategoryYearStatus, CategoryParticipation } from "@/lib/category/categories";
import type { MatchWithTeamNames } from "@/lib/matches";

export type YearData = {
  registrations: ComponentProps<typeof RegistrationsTable>["initial"];
  matches: MatchWithTeamNames[];
  categoryStatusItems: CategoryYearListItem[];
  categoryStatusById: Record<string, CategoryYearStatus>;
  categoryParticipation: Record<string, CategoryParticipation>;
};

type Props = {
  yearDataByYear: Record<number, YearData>;
  allYears: number[];
  categories: CategoryRecord[];
  players: ComponentProps<typeof PlayersTable>["rows"];
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
    { value: "registrations" as const, label: t.adminPage.tabs.registrations },
    { value: "categories" as const, label: t.adminPage.tabs.categories },
    { value: "players" as const, label: t.adminPage.tabs.players },
    { value: "users" as const, label: t.adminPage.tabs.users },
    { value: "matches" as const, label: t.adminPage.tabs.matches },
  ];
  type AdminView = (typeof viewTabs)[number]["value"];

  const [view, setView] = useTabParam(viewTabs, ["cat", "status", "round", "club", "group"]);

  const [yearParamStr, setYearParam] = useUrlParam("year");
  const yearParamNum = Number(yearParamStr);
  const thisYear = new Date().getFullYear();
  const year = yearParamNum > 0 && allYears.includes(yearParamNum)
    ? yearParamNum
    : allYears.includes(thisYear) ? thisYear : (allYears[0] ?? thisYear);
  const setYear = useCallback(
    (y: number) => setYearParam(String(y), { clear: ["cat", "round", "group"] }),
    [setYearParam]
  );

  const yearData = yearDataByYear[year] ?? emptyYearData;

  const [rawCatParam, setCatFilter] = useUrlParam("cat");
  const [rawRoundParam, setRoundFilter] = useUrlParam("round");
  const [rawGroupParam, setGroupFilter] = useUrlParam("group");
  const [rawClubParam, setClubFilter] = useUrlParam("club");
  const [playersSearch, setPlayersSearch] = useState("");

  const [rawStatusParam, setStatusParam] = useUrlParam("status");
  const categoryStatusFilter: CategoryYearStatus | "all" = rawStatusParam in CATEGORY_YEAR_STATUSES ? rawStatusParam as CategoryYearStatus : "all";
  const setCategoryStatusFilter = useCallback(
    (v: CategoryYearStatus | "all") => setStatusParam(v === "all" ? "" : v),
    [setStatusParam]
  );

  const showYearFilter = view !== "players" && view !== "users";

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const registrationCategoryOptions = useMemo(() => {
    const ids = [...new Set(yearData.registrations.map((r) => r.categoryId).filter(Boolean))].filter((id) =>
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
        { value: "Pending" as const, label: categoryYearStatusLabel("Pending", locale) },
        { value: "Active" as const, label: categoryYearStatusLabel("Active", locale) },
        { value: "Inactive" as const, label: categoryYearStatusLabel("Inactive", locale) },
      ],
    [locale]
  );

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

  const matchesGroupOptions = useMemo(() => {
    if (!rawRoundParam) return [];
    const catFiltered = rawCatParam
      ? yearData.matches.filter((m) => m.categoryId === rawCatParam)
      : yearData.matches;
    const roundFiltered = catFiltered.filter((m) => m.round?.code === rawRoundParam);
    const groups = new Set<string>();
    roundFiltered.forEach((m) => {
      if (m.team1Seed?.trim()) groups.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) groups.add(m.team2Seed.trim());
    });
    return [...groups].sort().map((g) => ({ value: g, label: g }));
  }, [yearData.matches, rawCatParam, rawRoundParam]);

  const regCategoryFilter = view === "registrations" && registrationCategoryOptions.some(o => o.id === rawCatParam) ? rawCatParam : "";
  const matchesCategoryFilter = view === "matches" && matchesCategoryOptions.some(o => o.id === rawCatParam) ? rawCatParam : "";
  const matchesRoundFilter = view === "matches" && matchesRoundOptions.some(o => o.value === rawRoundParam) ? rawRoundParam : "";
  const matchesGroupFilter = view === "matches" && matchesRoundFilter && matchesGroupOptions.some(o => o.value === rawGroupParam) ? rawGroupParam : "";
  const playersClubFilter = view === "players" ? rawClubParam : "";

  const playersClubOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) for (const c of p.clubs) set.add(c);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [players]);

  const showRegCategoryFilter = view === "registrations" && registrationCategoryOptions.length > 1;
  const showMatchesCategoryFilter = view === "matches" && matchesCategoryOptions.length > 1;
  const showMatchesRoundFilter = view === "matches" && matchesRoundOptions.length > 1;
  const showMatchesGroupFilter = view === "matches" && !!matchesRoundFilter && matchesGroupOptions.length > 1;
  const showCategoryStatusFilter = view === "categories";
  const showFilterBar =
    showYearFilter || showRegCategoryFilter || showMatchesCategoryFilter || showMatchesRoundFilter || showMatchesGroupFilter || showCategoryStatusFilter || view === "players";

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
        {showFilterBar ? (
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
                  onChange={(v) => setRoundFilter(v, { clear: ["group"] })}
                  allLabel={t.shared.labels.allRounds}
                />
              ) : null}
              {showMatchesGroupFilter ? (
                <GroupFilter
                  id="admin-matches-group"
                  value={matchesGroupFilter}
                  options={matchesGroupOptions.map((g) => g.value)}
                  onChange={setGroupFilter}
                  allLabel={t.shared.labels.allGroups}
                />
              ) : null}
              {showCategoryStatusFilter ? (
                <StatusFilter
                  id="admin-category-status-filter"
                  label={t.shared.labels.status}
                  value={categoryStatusFilter}
                  options={categoryStatusFilterOptions}
                  onChange={(v) => setCategoryStatusFilter(v as CategoryYearStatus | "all")}
                />
              ) : null}
              {view === "players" ? (
                <ClubFilter
                  id="admin-players-club"
                  value={playersClubFilter}
                  options={playersClubOptions}
                  onChange={setClubFilter}
                  allLabel={t.shared.labels.allClubs}
                />
              ) : null}
              {view === "players" ? (
                <div className="min-w-0 flex-1 basis-0 max-w-xs">
                  <SearchBox
                    id="admin-players-search"
                    value={playersSearch}
                    onChange={(e) => setPlayersSearch(e.target.value)}
                    ariaLabel={t.shared.labels.search}
                    className="w-full"
                  />
                </div>
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
            />
          </section>
        )}
        {view === "categories" && (
          <section>
            <CategoryStatusTable
              categories={categories}
              year={year}
              initialItems={yearData.categoryStatusItems}
              participationByCategory={yearData.categoryParticipation}
              registrations={yearData.registrations}
              statusFilter={categoryStatusFilter}
            />
          </section>
        )}
        {view === "players" && (
          <section>
            <PlayersTable
              rows={players}
              mode="admin"
              enableAdminEditor
              emptyNoRowsText="No players in the database yet."
              emptyNoMatchText={t.adminPlayers.noSearchResults}
              showCount
              clubFilter={playersClubFilter}
              search={playersSearch}
              onSearchChange={setPlayersSearch}
            />
          </section>
        )}
        {view === "users" && (
          <section>
            <AdminUsersTable rows={adminUsers} />
          </section>
        )}
        {view === "matches" && (
          <section>
            <MatchesTable
              year={year}
              categories={categories}
              matches={yearData.matches}
              categoryFilter={matchesCategoryFilter}
              roundFilter={matchesRoundFilter}
              seedFilter={matchesGroupFilter}
            />
          </section>
        )}
      </div>
    </section>
  );
}
