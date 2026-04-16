"use client";

import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import type { CategoryRecord } from "@/lib/categories/types";
import type { MatchWithTeamNames } from "@/lib/matches";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
import { useLocale } from "@/lib/locale-context";
import {
  MATCH_ROUND_PRE,
  matchRoundAdminDefaultRank,
  normalizeMatchRoundCode,
  sortMatchesAdminDefault,
} from "@/lib/matchRoundCode";
import { Table } from "@/app/components/ui/table/Table";
import {
  TableMatchScoresStacked,
  TableMatchStatusPill,
  TableStackedPlayersCell,
} from "@/app/components/ui/table/tableCells";
import { Modal } from "@/app/components/ui/Modal";
import { EditMatchModal } from "../modals/EditMatchModal";
import { isCategoryConfirmedInYearMap, type CategoryYearStatus } from "@/lib/categories/yearStatus";

function formatMatchDateShort(isoDate: string | null | undefined, locale: "en" | "ko" = "en"): string {
  const d = isoDate?.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d && d.length > 0 ? d : "—";
  const ms = Date.parse(`${d}T12:00:00`);
  if (!Number.isFinite(ms)) return d;
  return locale === "ko"
    ? new Date(ms).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function matchDateSortMs(m: MatchWithTeamNames): number {
  const d = m.date?.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return 0;
  return Date.parse(`${d}T12:00:00`) || 0;
}

function matchScoreLines(m: MatchWithTeamNames): string[] {
  const lines: string[] = [];
  const push = (a: string | null | undefined, b: string | null | undefined) => {
    const sa = (a ?? "").trim();
    const sb = (b ?? "").trim();
    if (sa || sb) lines.push(`${sa || "—"}-${sb || "—"}`);
  };
  push(m.set1ScoreTeam1, m.set1ScoreTeam2);
  push(m.set2ScoreTeam1, m.set2ScoreTeam2);
  push(m.set3ScoreTeam1, m.set3ScoreTeam2);
  return lines;
}

type Props = {
  year: number;
  categories: CategoryRecord[];
  matches: MatchWithTeamNames[];
  /** When set, categories marked cancelled for this admin year are omitted from the category filter. */
  categoryStatusById?: Record<string, CategoryYearStatus>;
  totalCount?: number;
  /** When set with {@link onCategoryFilterChange}, category filter UI is omitted (parent renders it). */
  categoryFilter?: string;
  onCategoryFilterChange?: (value: string) => void;
  /** When set with {@link onRoundFilterChange}, round filter UI is omitted (parent renders it). */
  roundFilter?: string;
  onRoundFilterChange?: (value: string) => void;
  /** When set with {@link onSeedFilterChange}, seed filter UI is omitted (parent renders it). */
  seedFilter?: string;
  onSeedFilterChange?: (value: string) => void;
};

type MatchSortKey =
  | "category"
  | "round"
  | "team1"
  | "team2"
  | "date"
  | "time"
  | "location"
  | "score"
  | "status";

function roundSortKey(m: MatchWithTeamNames): string {
  const rank = matchRoundAdminDefaultRank(m.round);
  const n = m.matchNumber ?? 0;
  return `${String(rank).padStart(3, "0")}\0${String(n).padStart(6, "0")}\0${m.id}`;
}

export function MatchesTable({
  year,
  categories,
  matches,
  categoryStatusById,
  totalCount,
  categoryFilter: categoryFilterProp,
  onCategoryFilterChange,
  roundFilter: roundFilterProp,
  onRoundFilterChange,
  seedFilter: seedFilterProp,
  onSeedFilterChange,
}: Props) {
  const { t, matchStatusLabel, matchRoundLabel, locale } = useLocale();
  const router = useRouter();
  const am = t.adminMatches;

  const [rows, setRows] = useState<MatchWithTeamNames[]>(matches);
  const categoryFilterControlled = onCategoryFilterChange != null;
  const [internalCategoryFilter, setInternalCategoryFilter] = useState("");
  const categoryFilter = categoryFilterControlled ? (categoryFilterProp ?? "") : internalCategoryFilter;
  const setCategoryFilter = categoryFilterControlled ? onCategoryFilterChange! : setInternalCategoryFilter;
  const roundFilterControlled = onRoundFilterChange != null;
  const [internalRoundFilter, setInternalRoundFilter] = useState("");
  const roundFilter = roundFilterControlled ? (roundFilterProp ?? "") : internalRoundFilter;
  const setRoundFilter = roundFilterControlled ? onRoundFilterChange! : setInternalRoundFilter;
  const seedFilterControlled = onSeedFilterChange != null;
  const [internalSeedFilter, setInternalSeedFilter] = useState("");
  const seedFilter = seedFilterControlled ? (seedFilterProp ?? "") : internalSeedFilter;
  const setSeedFilter = seedFilterControlled ? onSeedFilterChange! : setInternalSeedFilter;
  const [editing, setEditing] = useState<MatchWithTeamNames | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<MatchWithTeamNames | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<MatchSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
  }, [year]);

  useEffect(() => {
    setRows(matches);
    setCategoryFilter("");
    setRoundFilter("");
    setSeedFilter("");
  }, [matches, setCategoryFilter, setRoundFilter, setSeedFilter]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoryOptions = useMemo(() => {
    const ids = [...new Set(rows.map((m) => m.categoryId).filter((id): id is string => !!id))].filter(
      (id) =>
        categoryStatusById == null || isCategoryConfirmedInYearMap(id, categoryStatusById)
    );
    return ids
      .map((id) => ({ id, label: categoryLabelForId(categoriesById, id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [rows, categoriesById, locale, categoryStatusById]);

  useEffect(() => {
    if (categoryFilter && !categoryOptions.some((c) => c.id === categoryFilter)) {
      setCategoryFilter("");
    }
  }, [categoryFilter, categoryOptions, setCategoryFilter]);

  const categoryFilteredRows = useMemo(
    () => (categoryFilter ? rows.filter((m) => m.categoryId === categoryFilter) : rows),
    [rows, categoryFilter]
  );

  const roundOptions = useMemo(() => {
    const rounds = [...new Set(categoryFilteredRows.map((m) => m.round).filter((r): r is string => !!r))];
    rounds.sort((a, b) => matchRoundAdminDefaultRank(a) - matchRoundAdminDefaultRank(b));
    return rounds.map((r) => ({ value: r, label: matchRoundLabel(r) ?? r }));
  }, [categoryFilteredRows, matchRoundLabel]);

  useEffect(() => {
    if (roundFilter && !roundOptions.some((r) => r.value === roundFilter)) {
      setRoundFilter("");
    }
  }, [roundFilter, roundOptions, setRoundFilter]);

  const roundFilteredRows = useMemo(
    () => (roundFilter ? categoryFilteredRows.filter((m) => m.round === roundFilter) : categoryFilteredRows),
    [categoryFilteredRows, roundFilter]
  );

  const seedOptions = useMemo(() => {
    if (!roundFilter) return [];
    const seeds = new Set<string>();
    roundFilteredRows.forEach((m) => {
      if (m.team1Seed?.trim()) seeds.add(m.team1Seed.trim());
      if (m.team2Seed?.trim()) seeds.add(m.team2Seed.trim());
    });
    return [...seeds].sort().map((s) => ({ value: s, label: s }));
  }, [roundFilteredRows, roundFilter]);

  useEffect(() => {
    if (seedFilter && !seedOptions.some((s) => s.value === seedFilter)) {
      setSeedFilter("");
    }
  }, [seedFilter, seedOptions, setSeedFilter]);

  const filteredRows = useMemo(
    () => (seedFilter ? roundFilteredRows.filter((m) => m.team1Seed?.trim() === seedFilter || m.team2Seed?.trim() === seedFilter) : roundFilteredRows),
    [roundFilteredRows, seedFilter]
  );

  const handleMatchSort = useCallback(
    (key: string) => {
      const k = key as MatchSortKey;
      if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(k);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedMatches = useMemo(() => {
    if (!sortKey) return sortMatchesAdminDefault(filteredRows);
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number) => (a - b) * dir;

    return [...filteredRows].sort((a, b) => {
      switch (sortKey) {
        case "category":
          return cmpStr((a.categoryId ?? "").trim(), (b.categoryId ?? "").trim());
        case "round":
          return cmpStr(roundSortKey(a), roundSortKey(b));
        case "team1":
          return cmpStr((a.team1DisplayName ?? "").trim(), (b.team1DisplayName ?? "").trim());
        case "team2":
          return cmpStr((a.team2DisplayName ?? "").trim(), (b.team2DisplayName ?? "").trim());
        case "date":
          return cmpNum(matchDateSortMs(a), matchDateSortMs(b));
        case "time":
          return cmpStr((a.time ?? "").trim(), (b.time ?? "").trim());
        case "location":
          return cmpStr((a.location ?? "").trim(), (b.location ?? "").trim());
        case "score":
          return cmpStr(matchScoreLines(a).join("\n"), matchScoreLines(b).join("\n"));
        case "status":
          return cmpStr((a.matchStatus ?? "").trim(), (b.matchStatus ?? "").trim());
        default:
          return 0;
      }
    });
  }, [filteredRows, sortKey, sortDir]);

  const locationOptions = useMemo(
    () => [...new Set(rows.map((m) => m.location).filter((x): x is string => !!x?.trim()))].sort(),
    [rows]
  );

  const showCategoryColumn = categoryFilter === "";

  const { headers, sortKeys, columnNoWrap, dataRows } = useMemo(() => {
    const tailHeaders = [
      am.tableSeed,
      am.tableTeam1,
      am.tableTeam2,
      am.tableDate,
      am.tableTime,
      am.tableLocation,
      am.tableScore,
      am.tableStatus,
    ] as const;

    const tailKeys: (string | null)[] = [null, "team1", "team2", "date", "time", "location", "score", "status"];

    const headersResolved = showCategoryColumn
      ? [am.tableCategory, am.tableRound, ...tailHeaders]
      : [am.tableRound, ...tailHeaders];

    const keysResolved: (string | null)[] = showCategoryColumn
      ? ["category", "round", ...tailKeys]
      : ["round", ...tailKeys];

    const hasAnyPrelimSeedData = sortedMatches.some((m) => {
      const isPrelim = normalizeMatchRoundCode(m.round) === MATCH_ROUND_PRE;
      if (!isPrelim) return false;
      const s1 = (m.team1Seed ?? "").trim();
      const s2 = (m.team2Seed ?? "").trim();
      return s1.length > 0 || s2.length > 0;
    });

    const rowsResolved = sortedMatches.map((m) => {
      const roundCell = matchRoundLabel(m.round) ?? ((m.round ?? "").trim() || "—");
      const isPrelim = normalizeMatchRoundCode(m.round) === MATCH_ROUND_PRE;
      const s1 = (m.team1Seed ?? "").trim();
      const s2 = (m.team2Seed ?? "").trim();

      const seedCell = !hasAnyPrelimSeedData || !isPrelim
        ? ""
        : s1 && s2 && s1 !== s2
          ? `${s1}/${s2}`
          : s1 || s2 || "";

      const tailCells: ReactNode[] = [
        seedCell,
        <TableStackedPlayersCell key={`${m.id}-t1`} text={locale === "ko" ? (m.team1DisplayNameKo ?? m.team1DisplayName) : m.team1DisplayName} />,
        <TableStackedPlayersCell key={`${m.id}-t2`} text={locale === "ko" ? (m.team2DisplayNameKo ?? m.team2DisplayName) : m.team2DisplayName} />,
        formatMatchDateShort(m.date, locale),
        m.time ?? "—",
        m.location ?? "—",
        <TableMatchScoresStacked key={`${m.id}-score`} lines={matchScoreLines(m)} />,
        <TableMatchStatusPill
          key={`${m.id}-status`}
          status={m.matchStatus}
          label={matchStatusLabel(m.matchStatus)}
        />,
      ];

      return showCategoryColumn
        ? [categoryLabelForId(categoriesById, m.categoryId, locale), roundCell, ...tailCells]
        : [roundCell, ...tailCells];
    });

    const columnNoWrapResolved = keysResolved.map((k) => k === "date" || k === "time" || k === "ntrp");

    return {
      headers: [...headersResolved],
      sortKeys: keysResolved,
      columnNoWrap: columnNoWrapResolved,
      dataRows: rowsResolved,
    };
  }, [sortedMatches, showCategoryColumn, categoriesById, am, matchStatusLabel]);

  async function handleSaveMatch(formData: Partial<MatchWithTeamNames>) {
    if (!editing) return;
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/matches/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || am.updateFailed);
        return;
      }

      setRows((prev) =>
        prev.map((m) =>
          m.id === editing.id
            ? {
                ...m,
                ...formData,
                date: (formData.date as string | null | undefined) ?? m.date,
                time: (formData.time as string | null | undefined) ?? m.time,
                location: (formData.location as string | null | undefined) ?? m.location,
                matchStatus: (formData.matchStatus as string | null | undefined) ?? m.matchStatus,
                set1ScoreTeam1: (formData.set1ScoreTeam1 as string | null | undefined) ?? m.set1ScoreTeam1,
                set1ScoreTeam2: (formData.set1ScoreTeam2 as string | null | undefined) ?? m.set1ScoreTeam2,
                set2ScoreTeam1: (formData.set2ScoreTeam1 as string | null | undefined) ?? m.set2ScoreTeam1,
                set2ScoreTeam2: (formData.set2ScoreTeam2 as string | null | undefined) ?? m.set2ScoreTeam2,
                set3ScoreTeam1: (formData.set3ScoreTeam1 as string | null | undefined) ?? m.set3ScoreTeam1,
                set3ScoreTeam2: (formData.set3ScoreTeam2 as string | null | undefined) ?? m.set3ScoreTeam2,
                comment: (formData.comment as string | null | undefined) ?? m.comment,
              }
            : m
        )
      );

      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const handleRequestDeleteMatch = useCallback(() => {
    if (!editing) return;
    setDeletingMatch(editing);
    setEditing(null);
  }, [editing]);

  const handleCancelDeleteMatch = useCallback(() => setDeletingMatch(null), []);

  async function handleConfirmDeleteMatch() {
    if (!deletingMatch) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/matches/${deletingMatch.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || am.deleteFailed);
        return;
      }
      setRows((prev) => prev.filter((m) => m.id !== deletingMatch.id));
      setDeletingMatch(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      )}

      {(!categoryFilterControlled && categoryOptions.length > 1) || (!roundFilterControlled && roundOptions.length > 1) || (!seedFilterControlled && seedOptions.length > 1) ? (
        <FilterGroup>
          {!categoryFilterControlled && categoryOptions.length > 1 ? (
            <Filter control="stretch" htmlFor="matches-category" label={t.shared.labels.category}>
              <Filter.Select
                id="matches-category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setRoundFilter("");
                  setSeedFilter("");
                  e.currentTarget.blur();
                }}
              >
                <option value="">{t.shared.labels.allCategories}</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Filter.Select>
            </Filter>
          ) : null}
          {!roundFilterControlled && roundOptions.length > 1 ? (
            <Filter control="stretch" htmlFor="matches-round" label={t.shared.labels.round}>
              <Filter.Select
                id="matches-round"
                value={roundFilter}
                onChange={(e) => {
                  setRoundFilter(e.target.value);
                  setSeedFilter("");
                  e.currentTarget.blur();
                }}
              >
                <option value="">{t.shared.labels.allRounds}</option>
                {roundOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Filter.Select>
            </Filter>
          ) : null}
          {!seedFilterControlled && seedOptions.length > 1 ? (
            <Filter control="stretch" htmlFor="matches-seed" label={t.shared.labels.seed}>
              <Filter.Select
                id="matches-seed"
                value={seedFilter}
                onChange={(e) => {
                  setSeedFilter(e.target.value);
                  e.currentTarget.blur();
                }}
              >
                <option value="">{t.shared.labels.allSeeds}</option>
                {seedOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Filter.Select>
            </Filter>
          ) : null}
        </FilterGroup>
      ) : null}

      {rows.length === 0 ? (
        <p className="py-8 text-[var(--color-text-tertiary)]">{am.emptyState}</p>
      ) : (
        <div className="flex w-full min-w-0 flex-col">
          <Table
            variant="data"
            columnNoWrap={columnNoWrap}
            headers={headers}
            sortConfig={{
              activeKey: sortKey,
              direction: sortDir,
              keys: sortKeys,
              onSort: handleMatchSort,
            }}
            dataRows={dataRows}
            onRowClick={(_, rowIndex) => {
              const match = sortedMatches[rowIndex];
              if (match) setEditing(match);
            }}
          />
          <div className="mt-2 flex w-full justify-end">
            <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
              {am.totalCount(sortedMatches.length)}
            </p>
          </div>
        </div>
      )}

      {editing && (
        <EditMatchModal
          key={editing.id}
          match={editing}
          categories={categories}
          locationOptions={locationOptions}
          onClose={() => setEditing(null)}
          onRequestDelete={handleRequestDeleteMatch}
          onSave={handleSaveMatch}
          saving={saving}
        />
      )}

      {deletingMatch && (
        <Modal
          onClose={handleCancelDeleteMatch}
          title={am.deleteTitle}
          ariaLabelledBy="delete-match-modal-title"
          maxWidthClassName="w-full max-w-sm"
          primaryAction={{
            label: saving ? am.deleting : am.delete,
            onClick: handleConfirmDeleteMatch,
            type: "button",
            disabled: saving,
          }}
        >
          <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{am.deleteWarning}</p>
        </Modal>
      )}
    </>
  );
}