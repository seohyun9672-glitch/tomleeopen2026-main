"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ntrpSortValue } from "@/lib/ntrpFormat";
import { Table } from "@/app/components/ui/table/Table";
import { useLocale } from "@/lib/locale-context";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { ClubFilter } from "@/app/components/FilterControls";
import { SearchBox } from "@/app/components/ui/SearchBox";
import {
  TableDataChip,
  TableDataChipGroup,
  TablePlayerDirectoryNameCell,
  TableTechnicalIdCell,
} from "@/app/components/ui/table/tableCells";
import { clubChipClass } from "@/lib/clubs";
import { DeletePlayerModal } from "../admin/modals/DeletePlayerModal";
import { EditPlayerModal } from "../admin/modals/EditPlayerModal";

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
  showClubFilter?: boolean;
  showCount?: boolean;
  clubFilter?: string;
  onClubFilterChange?: (value: string) => void;
};

type PublicSortKey = "name" | "club";
type AdminSortKey = "id" | "name" | "email" | "phone" | "ntrp" | "clubs";

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
  const [publicSortKey, setPublicSortKey] = useState<PublicSortKey | null>(null);
  const [publicSortDir, setPublicSortDir] = useState<"asc" | "desc">("asc");
  const [adminSortKey, setAdminSortKey] = useState<AdminSortKey | null>(null);
  const [adminSortDir, setAdminSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    const cmpStr = (a: string, b: string, dir: 1 | -1) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number, dir: 1 | -1) => (a - b) * dir;

    if (mode === "public") {
      if (!publicSortKey) return rows;
      const dir = publicSortDir === "asc" ? 1 : -1;
      return [...rows].sort((a, b) => {
        if (publicSortKey === "name") {
          const aName = (locale === "ko" ? a.fullNameKo?.trim() || a.fullNameEn : a.fullNameEn).trim();
          const bName = (locale === "ko" ? b.fullNameKo?.trim() || b.fullNameEn : b.fullNameEn).trim();
          return cmpStr(aName, bName, dir);
        }
        const aClub = a.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
        const bClub = b.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
        return cmpStr(aClub, bClub, dir);
      });
    }

    if (!adminSortKey) return rows;
    const dir = adminSortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (adminSortKey) {
        case "id":
          return cmpNum(a.id, b.id, dir);
        case "name":
          return cmpStr(a.fullNameEn.trim(), b.fullNameEn.trim(), dir);
        case "email":
          return cmpStr((a.email ?? "").trim(), (b.email ?? "").trim(), dir);
        case "phone":
          return cmpStr((a.phone ?? "").trim(), (b.phone ?? "").trim(), dir);
        case "ntrp":
          return cmpNum(ntrpSortValue(a.ntrp ?? null), ntrpSortValue(b.ntrp ?? null), dir);
        case "clubs":
          return cmpStr(a.clubs.join(", "), b.clubs.join(", "), dir);
        default:
          return 0;
      }
    });
  }, [rows, locale, mode, publicSortKey, publicSortDir, adminSortKey, adminSortDir]);

  if (mode === "public") {
    return (
      <Table
        variant="data"
        headers={[labels.name, labels.club]}
        sortConfig={{
          activeKey: publicSortKey,
          direction: publicSortDir,
          keys: ["name", "club"],
          onSort: (key) => {
            const next = key as PublicSortKey;
            if (publicSortKey === next) setPublicSortDir((d) => (d === "asc" ? "desc" : "asc"));
            else {
              setPublicSortKey(next);
              setPublicSortDir("asc");
            }
          },
        }}
        dataRows={sortedRows.map((p) => {
          const en = p.fullNameEn.trim();
          const ko = p.fullNameKo?.trim() ?? "";
          const primary = locale === "ko" ? ko || en : en;
          return [
            <TablePlayerDirectoryNameCell key={p.id} primary={primary} />,
            <TableDataChipGroup key={`${p.id}-c`}>
              {p.clubs.map((c) => <TableDataChip key={c} className={clubChipClass(c)} label={c} />)}
            </TableDataChipGroup>,
          ];
        })}
      />
    );
  }

  return (
    <Table
      variant="data"
      columnNoWrap={[false, false, false, false, true, false]}
      headers={[labels.id, labels.name, labels.email, labels.phone, labels.ntrp, labels.club]}
      sortConfig={{
        activeKey: adminSortKey,
        direction: adminSortDir,
        keys: ["id", "name", "email", "phone", "ntrp", "clubs"],
        onSort: (key) => {
          const next = key as AdminSortKey;
          if (adminSortKey === next) setAdminSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setAdminSortKey(next);
            setAdminSortDir("asc");
          }
        },
      }}
      dataRows={sortedRows.map((p) => {
        const displayName =
          locale === "ko" && p.fullNameKo?.trim() ? p.fullNameKo.trim() : p.fullNameEn;
        return [
          <TableTechnicalIdCell key={`${p.id}-id`}>{p.id}</TableTechnicalIdCell>,
          <span key={`${p.id}-name`}>{displayName}</span>,
          p.email ?? "—",
          p.phone ?? "—",
          p.ntrp ?? "—",
          <TableDataChipGroup key={`${p.id}-clubs`}>
            {p.clubs.map((c) => <TableDataChip key={c} className={clubChipClass(c)} label={c} />)}
          </TableDataChipGroup>,
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

function rowMatchesSearch(row: PlayerTableRow, rawQuery: string, mode: "public" | "admin"): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
  if (lc(row.fullNameEn).includes(q) || lc(row.fullNameKo).includes(q)) return true;
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
  showClubFilter = mode === "public",
  showCount = false,
  clubFilter: clubFilterProp,
  onClubFilterChange,
}: PlayersTableProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const clubFilterControlled = onClubFilterChange != null;
  const [internalClubFilter, setInternalClubFilter] = useState("");
  const clubFilter = clubFilterControlled ? (clubFilterProp ?? "") : internalClubFilter;
  const setClubFilter = clubFilterControlled ? onClubFilterChange : setInternalClubFilter;
  const [editing, setEditing] = useState<PlayerTableRow | null>(null);
  const [deleting, setDeleting] = useState<PlayerTableRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const adminEditorEnabled = mode === "admin" && enableAdminEditor;

  const clubOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of rows) for (const c of p.clubs) set.add(c);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows.filter((r) => rowMatchesSearch(r, search, mode));
    if (showClubFilter && clubFilter) list = list.filter((r) => r.clubs.includes(clubFilter));
    return list;
  }, [rows, search, mode, showClubFilter, clubFilter]);

  async function handleDelete(player: PlayerTableRow) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Delete failed");
        return;
      }
      setDeleting(null);
      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const handleTableRowClick = onRowClick ?? (adminEditorEnabled ? (row: PlayerTableRow) => setEditing(row) : undefined);

  return (
    <div className="space-y-[var(--content-gap)] md:space-y-[var(--content-gap)]">
      {error ? (
        <div className="rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      ) : null}

      <FilterGroup>
        {showClubFilter ? (
          <ClubFilter
            id="players-club"
            value={clubFilter}
            options={clubOptions}
            onChange={setClubFilter}
            allLabel={t.shared.labels.allClubs}
          />
        ) : null}

        <div className="min-w-0 flex-1 basis-0 max-w-xs">
          <SearchBox
            id={mode === "admin" ? "admin-players-search" : "players-search"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            ariaLabel={t.shared.labels.search}
            className="w-full"
          />
        </div>
      </FilterGroup>

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
          {showCount ? (
            <div className="mt-2 flex w-full justify-end">
              <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
                {t.adminPlayers.totalCount(filteredRows.length)}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {adminEditorEnabled && editing ? (
        <EditPlayerModal
          key={editing.id}
          player={editing}
          onClose={() => setEditing(null)}
          onRequestDelete={() => setDeleting(editing)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          saving={saving}
          setSaving={setSaving}
          setError={setError}
        />
      ) : null}

      {adminEditorEnabled && deleting ? (
        <DeletePlayerModal
          player={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
          saving={saving}
        />
      ) : null}
    </div>
  );
}