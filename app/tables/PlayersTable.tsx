"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ntrpSortValue } from "@/lib/ntrpFormat";
import { Table } from "@/app/components/ui/table/Table";
import { useLocale } from "@/lib/locale-context";
import { SearchBox } from "@/app/components/ui/SearchBox";
import { clubChipClass } from "@/lib/clubs";
// import { ClubFilter } from "@/app/components/FilterControls";
import { DeletePlayerModal } from "@/app/[locale]/admin/modals/DeletePlayerModal";
import { PlayerModal } from "@/app/[locale]/admin/modals/PlayerModal";

export type PlayerTableRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  clubs: string[];
  email?: string | null;
  phone?: string | null;
  ntrp?: string | null;
};

export type PlayersTableProps = {
  rows: PlayerTableRow[];
  mode: "public" | "admin";
  onRowClick?: (row: PlayerTableRow) => void;
  enableAdminEditor?: boolean;
  emptyNoRowsText: string;
  emptyNoMatchText: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  onCountChange?: (n: number) => void;
};

type SortKey = "name" | "club" | "id" | "email" | "phone" | "ntrp" | "clubs";

function PlayersDataTable({
  rows,
  locale,
  mode,
  labels,
  onRowClick,
}: {
  rows: PlayerTableRow[];
  locale: "en" | "ko";
  mode: "public" | "admin";
  labels: {
    id: string;
    name: string;
    email: string;
    phone: string;
    ntrp: string;
    club: string;
  };
  onRowClick?: (row: PlayerTableRow) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    const cmpStr = (a: string, b: string, dir: 1 | -1) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number, dir: 1 | -1) => (a - b) * dir;

    if (!sortKey) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const aName = (
            locale === "ko"
              ? a.fullNameKo?.trim() || a.fullNameEn
              : a.fullNameEn
          ).trim();
          const bName = (
            locale === "ko"
              ? b.fullNameKo?.trim() || b.fullNameEn
              : b.fullNameEn
          ).trim();
          return cmpStr(aName, bName, dir);
        }
        case "club":
        case "clubs": {
          const aClub =
            a.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
          const bClub =
            b.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
          return cmpStr(aClub, bClub, dir);
        }
        case "id":
          return cmpNum(a.id, b.id, dir);
        case "email":
          return cmpStr((a.email ?? "").trim(), (b.email ?? "").trim(), dir);
        case "phone":
          return cmpStr((a.phone ?? "").trim(), (b.phone ?? "").trim(), dir);
        case "ntrp":
          return cmpNum(
            ntrpSortValue(a.ntrp ?? null),
            ntrpSortValue(b.ntrp ?? null),
            dir,
          );
        default:
          return 0;
      }
    });
  }, [rows, locale, sortKey, sortDir]);

  const VALID_SORT_KEYS: SortKey[] = ["name", "club", "id", "email", "phone", "ntrp", "clubs"];

  const handleSort = (key: string) => {
    if (!VALID_SORT_KEYS.includes(key as SortKey)) return;
    const next = key as SortKey;
    if (sortKey === next) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(next);
      setSortDir("asc");
    }
  };

  if (mode === "public") {
    return (
      <Table
        variant="data"
        headers={[labels.name, labels.club]}
        sortConfig={{
          activeKey: sortKey,
          direction: sortDir,
          keys: ["name", "club"],
          onSort: handleSort,
        }}
        dataRows={sortedRows.map((p) => {
          const en = p.fullNameEn.trim();
          const ko = p.fullNameKo?.trim() ?? "";
          const primary = locale === "ko" ? ko || en : en;
          return [
            <span key={p.id} className="table-player-name-primary">
              {primary}
            </span>,
            <Table.Cell
              key={`${p.id}-c`}
              type="chips"
              items={p.clubs.map((c) => ({
                label: c,
                className: clubChipClass(c),
              }))}
            />,
          ];
        })}
      />
    );
  }

  return (
    <Table
      variant="data"
      columnNoWrap={[false, false, false, false, true, false]}
      headers={[
        labels.id,
        labels.name,
        labels.email,
        labels.phone,
        labels.ntrp,
        labels.club,
      ]}
      sortConfig={{
        activeKey: sortKey,
        direction: sortDir,
        keys: ["id", "name", "email", "phone", "ntrp", "clubs"],
        onSort: handleSort,
      }}
      dataRows={sortedRows.map((p) => {
        const displayName =
          locale === "ko" && p.fullNameKo?.trim()
            ? p.fullNameKo.trim()
            : p.fullNameEn;
        return [
          <Table.Cell key={`${p.id}-id`} type="technical-id">
            {p.id}
          </Table.Cell>,
          <span key={`${p.id}-name`}>{displayName}</span>,
          p.email ?? "—",
          p.phone ?? "—",
          p.ntrp ?? "—",
          <Table.Cell
            key={`${p.id}-clubs`}
            type="chips"
            items={p.clubs.map((c) => ({
              label: c,
              className: clubChipClass(c),
            }))}
          />,
        ];
      })}
      onRowClick={
        onRowClick
          ? (_, rowIndex) => {
              const row = sortedRows[rowIndex];
              if (row) onRowClick(row);
            }
          : undefined
      }
    />
  );
}

function rowMatchesSearch(
  row: PlayerTableRow,
  rawQuery: string,
  mode: "public" | "admin",
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
  if (lc(row.fullNameEn).includes(q) || lc(row.fullNameKo).includes(q))
    return true;
  if (row.clubs.some((c) => c.toLowerCase().includes(q))) return true;
  if (mode === "admin") {
    if (String(row.id).includes(q)) return true;
    if (lc(row.email).includes(q)) return true;
    if (lc(row.phone).includes(q)) return true;
    if (lc(row.ntrp).includes(q)) return true;
  }
  return false;
}

export function PlayersTable({
  rows,
  mode,
  onRowClick,
  enableAdminEditor = false,
  emptyNoRowsText,
  emptyNoMatchText,
  search: searchProp,
  onSearchChange,
  onCountChange,
}: PlayersTableProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [clubFilters, setClubFilters] = useState<string[]>([]);
  const [editing, setEditing] = useState<PlayerTableRow | null>(null);
  const [deleting, setDeleting] = useState<PlayerTableRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const adminEditorEnabled = mode === "admin" && enableAdminEditor;

  const availableClubs = useMemo(() => {
    const seen = new Set<string>();
    const clubs: string[] = [];
    for (const row of rows) {
      for (const c of row.clubs) {
        if (!seen.has(c)) { seen.add(c); clubs.push(c); }
      }
    }
    return clubs.sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchProp ?? search;
    let list = rows.filter((r) => rowMatchesSearch(r, q, mode));
    if (clubFilters.length > 0)
      list = list.filter((r) => clubFilters.some((c) => r.clubs.includes(c)));
    return list;
  }, [rows, searchProp, search, mode, clubFilters]);

  useEffect(() => {
    onCountChange?.(filteredRows.length);
  }, [filteredRows.length, onCountChange]);

  async function handleDelete(player: PlayerTableRow) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.adminPlayers.deleteFailed);
        return;
      }
      setDeleting(null);
      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const handleTableRowClick =
    onRowClick ??
    (adminEditorEnabled ? (row: PlayerTableRow) => setEditing(row) : undefined);

  return (
    <div className="space-y-[var(--content-gap)]">

      <div className="flex min-w-0 flex-wrap items-end gap-[var(--content-gap)]">
        {/* {availableClubs.length > 0 && (
          <ClubFilter
            id="players-club-filter"
            selected={clubFilters}
            options={availableClubs}
            onChange={setClubFilters}
          />
        )} */}
        {!onSearchChange && (
          <div className="min-w-0 max-w-xs flex-1">
            <SearchBox
              id="players-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ariaLabel={t.shared.labels.search}
              className="w-full"
            />
          </div>
        )}
      </div>


      {filteredRows.length === 0 ? (
        <div className="text-center text-[var(--color-text-tertiary)]">
          {rows.length === 0 ? emptyNoRowsText : emptyNoMatchText}
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col">
          <PlayersDataTable
            rows={filteredRows}
            locale={locale}
            mode={mode}
            onRowClick={handleTableRowClick}
            labels={{
              id: "ID",
              name: mode === "admin" ? "Name" : t.shared.labels.name,
              email: "Email",
              phone: "Phone",
              ntrp: "NTRP",
              club: mode === "admin" ? t.adminPlayers.clubs : t.shared.labels.club,
            }}
          />
        </div>
      )}

      {adminEditorEnabled && editing ? (
        <PlayerModal
          key={editing.id}
          mode="edit"
          player={editing}
          onClose={() => setEditing(null)}
          onRequestDelete={() => setDeleting(editing)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      ) : null}

      {adminEditorEnabled && deleting ? (
        <DeletePlayerModal
          player={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
          saving={saving}
          error={error}
        />
      ) : null}
    </div>
  );
}
