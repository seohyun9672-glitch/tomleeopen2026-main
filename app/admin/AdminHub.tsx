"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mergeFilterParams } from "@/lib/filterState";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { useTabParam } from "@/lib/hooks/useTabParam";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
import { deriveYearOptions } from "@/lib/filterUtils";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import { isCategoryConfirmedInYearMap } from "@/lib/categories/yearStatus";
import { TabList } from "@/app/components/ui/TabList";
import { Table } from "@/app/components/ui/table/Table";
import { RegistrationsTable } from "../tables/RegistrationsTable";
import { CategoryStatusTable } from "../tables/CategoryStatusTable";
import { MatchesTable } from "../tables/MatchesTable";
import { PlayersTable } from "../tables/PlayersTable";
import { useLocale } from "@/lib/locale-context";
import type { RoundInfo } from "@/lib/matches";
import type { CategoryRecord } from "@/lib/categories/types";
import type { RegistrationRow } from "../tables/RegistrationsTable";
import type { PlayerTableRow } from "../tables/PlayersTable";
import type { MatchWithTeamNames } from "@/lib/matches";
import type {
  CategoryYearListItem,
  CategoryYearStatus,
  CategoryParticipation,
} from "@/lib/categories/yearStatus";

export type YearData = {
  registrations: RegistrationRow[];
  matches: MatchWithTeamNames[];
  categoryStatusItems: CategoryYearListItem[];
  categoryStatusById: Record<string, CategoryYearStatus>;
  categoryParticipation: Record<string, CategoryParticipation>;
};

type AdminView = "registrations" | "categories" | "matches" | "players" | "users";

type Props = {
  yearData: YearData;
  year: number;
  allYears: number[];
  categories: CategoryRecord[];
  players: PlayerTableRow[];
  adminUsers: { id: string; email: string; createdAt: string }[];
};

export function AdminHub({
  yearData,
  year,
  allYears,
  categories,
  players,
  adminUsers,
}: Props) {
  const { t, locale } = useLocale();
  const router = useRouter();

  const viewTabs = [
    { value: "registrations" as const, label: t.adminPage.hubTabRegistrations },
    { value: "categories" as const, label: t.adminPage.hubTabCategories },
    { value: "players" as const, label: t.adminPage.hubTabPlayers },
    { value: "users" as const, label: t.adminPage.hubTabUsers },
    { value: "matches" as const, label: t.adminMatches.title },
  ];

  const [view, setView] = useTabParam(viewTabs, ["cat", "status", "round", "seed", "club", "group"]);

  const setYear = useCallback(
    (y: number) => {
      const next = mergeFilterParams(window.location.search, { year: String(y) }, ["cat", "round", "seed"]);
      router.push(`?${next.toString()}`);
    },
    [router]
  );

  const [rawCatParam, setCatFilter] = useUrlParam("cat");
  const [rawRoundParam, setRoundFilter] = useUrlParam("round");
  const [rawSeedParam, setSeedFilter] = useUrlParam("seed");
  const [rawClubParam, setClubFilter] = useUrlParam("club");

  const [rawStatusParam, setStatusParam] = useUrlParam("status");
  const VALID_CATEGORY_STATUSES = ["Pending", "Active", "Inactive"] as const;
  const categoryStatusFilter: CategoryYearStatus | "all" = VALID_CATEGORY_STATUSES.includes(rawStatusParam as CategoryYearStatus) ? rawStatusParam as CategoryYearStatus : "all";
  const setCategoryStatusFilter = useCallback(
    (v: CategoryYearStatus | "all") => setStatusParam(v === "all" ? "" : v),
    [setStatusParam]
  );

  const yearOptions = useMemo(() => deriveYearOptions(allYears), [allYears]);

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
      ] as const,
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
                <Filter control="year" htmlFor="admin-year" label={t.shared.labels.year}>
                  <Filter.Select
                    id="admin-year"
                    value={String(year)}
                    onChange={(e) => {
                      setYear(Number(e.currentTarget.value));
                      e.currentTarget.blur();
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </Filter.Select>
                </Filter>
              ) : null}
              {showRegCategoryFilter ? (
                <Filter control="category" htmlFor="admin-registrations-category" label={t.shared.labels.category}>
                  <Filter.Select
                    id="admin-registrations-category"
                    value={regCategoryFilter}
                    onChange={(e) => { setCatFilter(e.target.value); e.currentTarget.blur(); }}
                  >
                    <option value="">{t.shared.labels.allCategories}</option>
                    {registrationCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Filter.Select>
                </Filter>
              ) : null}
              {showMatchesCategoryFilter ? (
                <Filter control="stretch" htmlFor="admin-matches-category" label={t.shared.labels.category}>
                  <Filter.Select
                    id="admin-matches-category"
                    value={matchesCategoryFilter}
                    onChange={(e) => {
                      setCatFilter(e.target.value);
                      e.currentTarget.blur();
                    }}
                  >
                    <option value="">{t.shared.labels.allCategories}</option>
                    {matchesCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Filter.Select>
                </Filter>
              ) : null}
              {showMatchesRoundFilter ? (
                <Filter control="stretch" htmlFor="admin-matches-round" label={t.shared.labels.round}>
                  <Filter.Select
                    id="admin-matches-round"
                    value={matchesRoundFilter}
                    onChange={(e) => {
                      setRoundFilter(e.target.value, { clear: ["seed"] });
                      e.currentTarget.blur();
                    }}
                  >
                    <option value="">{t.shared.labels.allRounds}</option>
                    {matchesRoundOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Filter.Select>
                </Filter>
              ) : null}
              {showMatchesSeedFilter ? (
                <Filter control="stretch" htmlFor="admin-matches-seed" label={t.shared.labels.seed}>
                  <Filter.Select
                    id="admin-matches-seed"
                    value={matchesSeedFilter}
                    onChange={(e) => { setSeedFilter(e.target.value); e.currentTarget.blur(); }}
                  >
                    <option value="">{t.shared.labels.allSeeds}</option>
                    {matchesSeedOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Filter.Select>
                </Filter>
              ) : null}
              {showCategoryStatusFilter ? (
                <Filter control="status" htmlFor="admin-category-status-filter" label={t.adminCategoryYears.tableStatus}>
                  <Filter.Select
                    id="admin-category-status-filter"
                    value={categoryStatusFilter}
                    onChange={(e) => {
                      setCategoryStatusFilter(e.target.value as CategoryYearStatus | "all");
                      e.currentTarget.blur();
                    }}
                  >
                    {categoryStatusFilterOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Filter.Select>
                </Filter>
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
