"use client";

import { useMemo, useState, useEffect } from "react";
import { Table } from "@/app/components/ui/table/Table";
import { useLocale } from "@/lib/locale-context";
import { SearchBox } from "@/app/components/ui/SearchBox";
import { clubChipClass } from "@/lib/clubs";

export type PlayerTableRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  clubs: string[];
};

export type PlayersTableProps = {
  rows: PlayerTableRow[];
  emptyNoRowsText: string;
  emptyNoMatchText: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  onCountChange?: (n: number) => void;
};

type SortKey = "name" | "club";

function rowMatchesSearch(row: PlayerTableRow, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();
  if (lc(row.fullNameEn).includes(q) || lc(row.fullNameKo).includes(q)) return true;
  if (row.clubs.some((c) => c.toLowerCase().includes(q))) return true;
  return false;
}

export function PlayersTable({
  rows,
  emptyNoRowsText,
  emptyNoMatchText,
  search: searchProp,
  onSearchChange,
  onCountChange,
}: PlayersTableProps) {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filteredRows = useMemo(() => {
    const q = searchProp ?? search;
    return rows.filter((r) => rowMatchesSearch(r, q));
  }, [rows, searchProp, search]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    return [...filteredRows].sort((a, b) => {
      if (sortKey === "name") {
        const aName = (locale === "ko" ? a.fullNameKo?.trim() || a.fullNameEn : a.fullNameEn).trim();
        const bName = (locale === "ko" ? b.fullNameKo?.trim() || b.fullNameEn : b.fullNameEn).trim();
        return cmpStr(aName, bName);
      }
      if (sortKey === "club") {
        const aClub = a.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
        const bClub = b.clubs.slice().sort((x, y) => x.localeCompare(y, "en"))[0] ?? "";
        return cmpStr(aClub, bClub);
      }
      return 0;
    });
  }, [filteredRows, sortKey, sortDir, locale]);

  useEffect(() => {
    onCountChange?.(filteredRows.length);
  }, [filteredRows.length, onCountChange]);

  const handleSort = (key: string) => {
    const k = key as SortKey;
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="space-y-[var(--content-gap)]">
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

      {filteredRows.length === 0 ? (
        <div className="text-center text-[var(--color-text-tertiary)]">
          {rows.length === 0 ? emptyNoRowsText : emptyNoMatchText}
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col">
          <Table
            variant="data"
            headers={[t.shared.labels.name, t.shared.labels.club]}
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
                <span key={p.id} className="table-player-name-primary">{primary}</span>,
                <Table.Cell
                  key={`${p.id}-c`}
                  type="chips"
                  items={p.clubs.map((c) => ({ label: c, className: clubChipClass(c) }))}
                />,
              ];
            })}
          />
        </div>
      )}
    </div>
  );
}
