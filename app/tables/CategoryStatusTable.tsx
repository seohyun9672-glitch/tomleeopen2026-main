"use client";

import { useMemo, useState, useCallback, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { Filter } from "@/app/components/Filter";
import { buildCategoryByIdMap, categoryLabelForId, getCategoryId } from "@/lib/categories/labels";
import type { CategoryRecord } from "@/lib/categories/types";
import {
  type CategoryParticipation,
  type CategoryYearListItem,
  type CategoryYearStatus,
} from "@/lib/categories/yearStatus";
import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";
import { TableDataChip } from "@/app/components/ui/Chip";
import {
  parseRegistrationCategories,
  type RegistrationRow,
} from "@/app/tables/RegistrationsTable";
import { CategoryStatusModal } from "../admin/modals/CategoryStatusModal";

type Props = {
  categories: CategoryRecord[];
  year: number;
  initialItems: CategoryYearListItem[];
  participationByCategory: Record<string, CategoryParticipation>;
  registrations: RegistrationRow[];
  /** When set with {@link onStatusFilterChange}, status filter UI is omitted (parent renders it). */
  statusFilter?: CategoryYearStatus | "all";
  onStatusFilterChange?: (value: CategoryYearStatus | "all") => void;
};

type CategorySortKey = "category" | "players" | "status";

function statusMeta(
  status: CategoryYearStatus,
  t: ReturnType<typeof useLocale>["t"]
): { label: string; tone: "completed" | "cancelled" | "neutral" } {
  if (status === "Active") {
    return { label: t.adminCategoryYears.statusActive, tone: "completed" };
  }
  if (status === "Inactive") {
    return { label: t.adminCategoryYears.statusInactive, tone: "cancelled" };
  }
  return { label: t.adminCategoryYears.statusPending, tone: "neutral" };
}

export function CategoryStatusTable({
  categories,
  year,
  initialItems,
  participationByCategory,
  registrations,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
}: Props) {
  const { locale, t } = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<CategoryYearListItem[]>(initialItems);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const statusFilterControlled = onStatusFilterChange != null;
  const [internalStatusFilter, setInternalStatusFilter] = useState<CategoryYearStatus | "all">("all");
  const statusFilter = statusFilterControlled ? (statusFilterProp ?? "all") : internalStatusFilter;
  const setStatusFilter = statusFilterControlled ? onStatusFilterChange! : setInternalStatusFilter;
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<CategorySortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const registrationsByCategory = useMemo(() => {
    const map = new Map<string, RegistrationRow[]>();

    for (const reg of registrations) {
      const categoryIds = Array.from(
        new Set(
          parseRegistrationCategories(reg.categories, reg.category)
            .map((category) => getCategoryId(categories, category))
            .filter((categoryId): categoryId is string => Boolean(categoryId))
        )
      );

      for (const categoryId of categoryIds) {
        const list = map.get(categoryId) ?? [];
        list.push(reg);
        map.set(categoryId, list);
      }
    }

    return map;
  }, [registrations, categories]);

  const sorted = useMemo(() => {
    const filtered = items.filter((item) => {
      const regRows = registrationsByCategory.get(item.categoryId)?.length ?? 0;
      const p = participationByCategory[item.categoryId] ?? { teams: 0, players: 0 };
      const hasActivity = regRows > 0 || p.teams > 0 || p.players > 0;
      return hasActivity && (statusFilter === "all" || item.status === statusFilter);
    });

    if (!sortKey) return filtered;

    const dir = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number) => (a - b) * dir;

    return [...filtered].sort((a, b) => {
      const labelA = categoryLabelForId(categoriesById, a.categoryId, locale);
      const labelB = categoryLabelForId(categoriesById, b.categoryId, locale);
      const pa = participationByCategory[a.categoryId] ?? { teams: 0, players: 0 };
      const pb = participationByCategory[b.categoryId] ?? { teams: 0, players: 0 };

      switch (sortKey) {
        case "category":
          return cmpStr(labelA, labelB);
        case "players":
          return cmpNum(pa.players, pb.players);
        case "status":
          return cmpStr(a.status, b.status);
        default:
          return 0;
      }
    });
  }, [items, sortKey, sortDir, categoriesById, locale, participationByCategory, registrationsByCategory, statusFilter]);

  const handleSort = useCallback(
    (key: string) => {
      const k = key as CategorySortKey;
      if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(k);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const handleStatusChange = useCallback(
    async (catId: string, next: CategoryYearStatus): Promise<boolean> => {
      setError("");
      setSavingId(catId);

      const prev = items;
      setItems((rows) =>
        rows.map((r) => (r.categoryId === catId ? { ...r, status: next } : r))
      );

      try {
        const res = await fetch("/api/admin/category-years", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentYear: year,
            categoryId: catId,
            status: next,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setItems(prev);
          setError(typeof data.error === "string" ? data.error : "Update failed");
          return false;
        }

        router.refresh();
        return true;
      } finally {
        setSavingId(null);
      }
    },
    [items, year, router]
  );

  const activeCategoryItem = useMemo(
    () =>
      editingCategoryId
        ? items.find((item) => item.categoryId === editingCategoryId) ?? null
        : null,
    [editingCategoryId, items]
  );

  const activeCategoryRegistrations = useMemo(() => {
    if (!editingCategoryId) return [];

    const rows = registrationsByCategory.get(editingCategoryId) ?? [];
    const byPlayer = new Map<number | string, RegistrationRow>();

    for (const reg of rows) {
      const key = reg.playerId ?? reg.id;
      const existing = byPlayer.get(key);

      if (!existing) {
        byPlayer.set(key, reg);
        continue;
      }

      if (existing.category !== editingCategoryId && reg.category === editingCategoryId) {
        byPlayer.set(key, reg);
      }
    }

    return Array.from(byPlayer.values());
  }, [editingCategoryId, registrationsByCategory]);

  if (activeCategoryItem) {
    // keep derived data available for modal props below
  }

  const statusOptions: { value: CategoryYearStatus | "all"; label: string }[] = [
    { value: "all", label: t.shared.labels.allYears },
    { value: "Pending", label: t.adminCategoryYears.statusPending },
    { value: "Active", label: t.adminCategoryYears.statusActive },
    { value: "Inactive", label: t.adminCategoryYears.statusInactive },
  ];

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      ) : null}

      {!statusFilterControlled ? (
        <FilterGroup>
          <Filter control="status" htmlFor="category-status-filter" label={t.adminCategoryYears.tableStatus}>
            <Filter.Select
              id="category-status-filter"
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setStatusFilter(e.target.value as CategoryYearStatus | "all");
                e.currentTarget.blur();
              }}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Filter.Select>
          </Filter>
        </FilterGroup>
      ) : null}

      <div className="flex w-full min-w-0 flex-col">
        <Table
          variant="data"
          headers={[
            t.adminCategoryYears.tableCategory,
            t.adminCategoryYears.tablePlayers,
            t.adminCategoryYears.tableStatus,
          ]}
          sortConfig={{
            activeKey: sortKey,
            direction: sortDir,
            keys: ["category", "players", "status"],
            onSort: handleSort,
          }}
          dataRows={sorted.map((row) => {
            const label = categoryLabelForId(categoriesById, row.categoryId, locale);
            const p = participationByCategory[row.categoryId] ?? { teams: 0, players: 0 };
            const { label: statusLabel, tone: statusTone } = statusMeta(row.status, t);

            return [
              label,
              String(p.players),
              <TableDataChip key={`${row.categoryId}-status-chip`} variant="status" tone={statusTone}>
                {statusLabel}
              </TableDataChip>,
            ];
          })}
          onRowClick={(_, rowIndex) => {
            const row = sorted[rowIndex];
            if (row) setEditingCategoryId(row.categoryId);
          }}
        />

        <div className="mt-2 flex w-full justify-end">
          <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
            {t.adminCategoryYears.countLabel(sorted.length)}
          </p>
        </div>
      </div>

      {activeCategoryItem ? (
        <CategoryStatusModal
          category={activeCategoryItem}
          categories={categories}
          locale={locale}
          registrations={activeCategoryRegistrations}
          saving={savingId === activeCategoryItem.categoryId}
          onClose={() => setEditingCategoryId(null)}
          onSave={async (nextStatus) => {
            const ok = await handleStatusChange(activeCategoryItem.categoryId, nextStatus);
            if (ok) setEditingCategoryId(null);
          }}
        />
      ) : null}
    </>
  );
}