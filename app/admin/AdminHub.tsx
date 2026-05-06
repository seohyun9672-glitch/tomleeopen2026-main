"use client";

import { useMemo, useCallback, useState, useRef, type ComponentProps } from "react";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { useTabParam } from "@/lib/hooks/useTabParam";
import { YearFilter, CategoryFilter, RoundFilter, GroupFilter, StatusFilter } from "@/app/components/FilterControls";
import { SearchBox } from "@/app/components/ui/SearchBox";
import { TableLayout } from "@/app/components/layout/TableLayout";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  isCategoryConfirmedInYearMap,
  CATEGORY_YEAR_STATUSES,
} from "@/lib/category/categories";
import { TabList } from "@/app/components/ui/TabList";
import { RegistrationsTable } from "@/app/tables/RegistrationsTable";
import { CategoryStatusTable } from "@/app/tables/CategoryStatusTable";
import { MatchesTable } from "@/app/tables/MatchesTable";
import { PlayersTable } from "@/app/tables/PlayersTable";
import { AdminUsersTable } from "@/app/tables/AdminUsersTable";
import { PlayerModal } from "@/app/[locale]/admin/modals/PlayerModal";
import { AddCategoryModal } from "@/app/[locale]/admin/modals/AddCategoryModal";
import { AddMatchModal } from "@/app/[locale]/admin/modals/AddMatchModal";
import { Modal } from "@/app/components/ui/Modal";
import { RegistrationForm, type RegistrationFormHandle } from "@/app/registration/RegistrationForm";
import { useLocale } from "@/lib/locale-context";
import type { RoundInfo } from "@/lib/matches";
import { categoryYearStatusLabel } from "@/lib/category/categories";
import type { CategoryRecord, CategoryYearListItem, CategoryYearStatus, CategoryParticipation } from "@/lib/category/categories";
import type { MatchWithTeamNames } from "@/lib/matches";
import { useRouter } from "next/navigation";

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
  adminUsers: { id: string; email: string; active: boolean; createdAt: string }[];
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
  const router = useRouter();

  const viewTabs = [
    { value: "registrations" as const, label: t.adminPage.tabs.registrations },
    { value: "categories" as const, label: t.adminPage.tabs.categories },
    { value: "players" as const, label: t.adminPage.tabs.players },
    { value: "users" as const, label: t.adminPage.tabs.users },
    { value: "matches" as const, label: t.adminPage.tabs.matches },
  ];
  type AdminView = (typeof viewTabs)[number]["value"];

  const [view, setView] = useTabParam(viewTabs, ["cat", "status", "round", "group"]);

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
  const [playersSearch, setPlayersSearch] = useState("");

  const [rawStatusParam, setStatusParam] = useUrlParam("status");
  const categoryStatusFilter: CategoryYearStatus | "all" = rawStatusParam in CATEGORY_YEAR_STATUSES ? rawStatusParam as CategoryYearStatus : "all";
  const setCategoryStatusFilter = useCallback(
    (v: CategoryYearStatus | "all") => setStatusParam(v === "all" ? "" : v),
    [setStatusParam]
  );

  const [regsCount, setRegsCount] = useState<number | null>(null);
  const [catsCount, setCatsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [playersCount, setPlayersCount] = useState<number | null>(null);

  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addingRegistration, setAddingRegistration] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingMatch, setAddingMatch] = useState(false);
  const [addRegSubmitting, setAddRegSubmitting] = useState(false);
  const addRegFormRef = useRef<RegistrationFormHandle>(null);

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
  const showRegCategoryFilter = registrationCategoryOptions.length > 1;
  const showMatchesCategoryFilter = matchesCategoryOptions.length > 1;
  const showMatchesRoundFilter = matchesRoundOptions.length > 1;
  const showMatchesGroupFilter = !!matchesRoundFilter && matchesGroupOptions.length > 1;

  return (
    <section className="flex flex-col gap-[var(--content-gap)] md:gap-[var(--content-gap)]">
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

      <div className="w-full">
        {view === "registrations" && (
          <>
            <TableLayout
              filters={
                <>
                  <YearFilter
                    id="admin-year"
                    value={String(year)}
                    years={allYears}
                    onChange={(v) => setYear(Number(v))}
                  />
                  {showRegCategoryFilter && (
                    <CategoryFilter
                      id="admin-registrations-category"
                      value={regCategoryFilter}
                      options={registrationCategoryOptions}
                      onChange={setCatFilter}
                      allLabel={t.shared.labels.allCategories}
                    />
                  )}
                </>
              }
              onAdd={() => setAddingRegistration(true)}
              addLabel={t.adminRegistrations.addTitle}
              totalCount={regsCount != null ? t.adminRegistrations.totalCount(regsCount) : undefined}
              empty={regsCount === 0}
              emptyText={t.adminRegistrations.emptyState}
            >
              <RegistrationsTable
                initial={yearData.registrations}
                categories={categories}
                year={year}
                categoryStatusById={yearData.categoryStatusById}
                categoryFilter={regCategoryFilter}
                onCountChange={setRegsCount}
              />
            </TableLayout>

            {addingRegistration && (
              <Modal
                onClose={() => setAddingRegistration(false)}
                title={t.adminRegistrations.addModalTitle}
                ariaLabelledBy="add-registration-modal-title"
                primaryAction={{
                  label: addRegSubmitting ? t.adminPlayers.saving : t.adminPlayers.save,
                  onClick: () => addRegFormRef.current?.submit(),
                  type: "button",
                  disabled: addRegSubmitting,
                }}
              >
                <RegistrationForm
                  ref={addRegFormRef}
                  mode="adminEdit"
                  onClose={() => setAddingRegistration(false)}
                  onSuccess={() => { setAddingRegistration(false); router.refresh(); }}
                  onLoadingChange={setAddRegSubmitting}
                />
              </Modal>
            )}
          </>
        )}

        {view === "categories" && (
          <>
            <TableLayout
              filters={
                <>
                  <YearFilter
                    id="admin-year"
                    value={String(year)}
                    years={allYears}
                    onChange={(v) => setYear(Number(v))}
                  />
                  <StatusFilter
                    id="admin-category-status-filter"
                    label={t.shared.labels.status}
                    value={categoryStatusFilter}
                    options={categoryStatusFilterOptions}
                    onChange={(v) => setCategoryStatusFilter(v as CategoryYearStatus | "all")}
                  />
                </>
              }
              onAdd={() => setAddingCategory(true)}
              addLabel={t.categoryYears.addTitle}
              totalCount={catsCount != null ? t.categoryYears.countLabel(catsCount) : undefined}
              empty={catsCount === 0}
              emptyText={t.categoryYears.emptyState}
            >
              <CategoryStatusTable
                categories={categories}
                year={year}
                initialItems={yearData.categoryStatusItems}
                participationByCategory={yearData.categoryParticipation}
                registrations={yearData.registrations}
                statusFilter={categoryStatusFilter}
                onCountChange={setCatsCount}
              />
            </TableLayout>

            {addingCategory && (
              <AddCategoryModal
                categories={categories}
                year={year}
                existingItems={yearData.categoryStatusItems}
                onClose={() => setAddingCategory(false)}
                onSaved={() => { setAddingCategory(false); router.refresh(); }}
              />
            )}
          </>
        )}

        {view === "players" && (
          <>
            <TableLayout
              searchBar={
                <div className="min-w-0 flex-1 basis-0 max-w-xs">
                  <SearchBox
                    id="admin-players-search"
                    value={playersSearch}
                    onChange={(e) => setPlayersSearch(e.target.value)}
                    ariaLabel={t.shared.labels.search}
                    className="w-full"
                  />
                </div>
              }
              onAdd={() => setAddingPlayer(true)}
              addLabel={t.adminPlayers.addTitle}
              totalCount={playersCount != null ? t.adminPlayers.totalCount(playersCount) : undefined}
            >
              <PlayersTable
                rows={players}
                mode="admin"
                enableAdminEditor
                emptyNoRowsText="No players in the database yet."
                emptyNoMatchText={t.adminPlayers.noSearchResults}
                search={playersSearch}
                onSearchChange={setPlayersSearch}
                onCountChange={setPlayersCount}
              />
            </TableLayout>

            {addingPlayer && (
              <PlayerModal
                mode="add"
                onClose={() => setAddingPlayer(false)}
                onSaved={() => { setAddingPlayer(false); router.refresh(); }}
              />
            )}
          </>
        )}

        {view === "users" && (
          <AdminUsersTable rows={adminUsers} />
        )}

        {view === "matches" && (
          <>
            <TableLayout
              filters={
                <>
                  <YearFilter
                    id="admin-year"
                    value={String(year)}
                    years={allYears}
                    onChange={(v) => setYear(Number(v))}
                  />
                  {showMatchesCategoryFilter && (
                    <CategoryFilter
                      id="admin-matches-category"
                      value={matchesCategoryFilter}
                      options={matchesCategoryOptions}
                      onChange={setCatFilter}
                      allLabel={t.shared.labels.allCategories}
                    />
                  )}
                  {showMatchesRoundFilter && (
                    <RoundFilter
                      id="admin-matches-round"
                      value={matchesRoundFilter}
                      options={matchesRoundOptions}
                      onChange={(v) => setRoundFilter(v, { clear: ["group"] })}
                      allLabel={t.shared.labels.allRounds}
                    />
                  )}
                  {showMatchesGroupFilter && (
                    <GroupFilter
                      id="admin-matches-group"
                      value={matchesGroupFilter}
                      options={matchesGroupOptions.map((g) => g.value)}
                      onChange={setGroupFilter}
                      allLabel={t.shared.labels.allGroups}
                    />
                  )}
                </>
              }
              onAdd={() => setAddingMatch(true)}
              addLabel={t.adminMatches.addTitle}
              totalCount={matchesCount != null ? t.adminMatches.totalCount(matchesCount) : undefined}
              empty={matchesCount === 0}
              emptyText={t.adminMatches.emptyState}
            >
              <MatchesTable
                year={year}
                categories={categories}
                matches={yearData.matches}
                categoryFilter={matchesCategoryFilter}
                roundFilter={matchesRoundFilter}
                seedFilter={matchesGroupFilter}
                onCountChange={setMatchesCount}
              />
            </TableLayout>

            {addingMatch && (
              <AddMatchModal
                categories={categories}
                year={year}
                locationOptions={[...new Set(yearData.matches.map((m) => m.location).filter((l): l is string => !!l?.trim()))].sort()}
                onClose={() => setAddingMatch(false)}
                onSaved={() => { setAddingMatch(false); router.refresh(); }}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
