"use client";

import { useMemo, useState, type ReactNode } from "react";
import type React from "react";
import { Chip as ChipComponent } from "../Chip";
import { computeColumnMeta } from "./tableColumnUtils";
import type {
  DataTableProps,
  KeyValueTableRow,
  TableProps,
} from "./tableTypes";
import { isKeyValueListRow } from "./tableTypes";

// ─── Cell types ────────────────────────────────────────────────────────────────

export type Chip = { label: string; className?: string };

export type TableCellProps =
  | { type: "text";     value: string | null | undefined }
  | { type: "number";   value: number | null | undefined }
  | { type: "chips";    items: Chip[] }
  | { type: "stack";    lines: (string | null | undefined)[]; topBadge?: { label: string; className: string } }
  | { type: "checkbox"; checked: boolean; onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void };

const DATA_CHIP_SHELL =
  "inline-flex w-fit shrink-0 items-center rounded-2xl border border-[color:var(--chip-palette-ring)] px-2.5 py-1 text-left font-medium leading-snug whitespace-nowrap";

function TableCell(props: TableCellProps): ReactNode {
  switch (props.type) {
    case "text":
      return props.value ?? "—";
    case "number":
      return props.value != null ? props.value : "—";
    case "chips":
      return (
        <span className="chip-group">
          {props.items.map((chip, i) => (
            <ChipComponent
              key={i}
              className={chip.className ? `${DATA_CHIP_SHELL} ${chip.className}` : DATA_CHIP_SHELL}
              label={chip.label}
            />
          ))}
        </span>
      );
    case "stack":
      return (
        <span className="flex flex-col gap-0.5">
          {props.topBadge && (
            <ChipComponent size="sm" label={props.topBadge.label} className={props.topBadge.className} />
          )}
          {props.lines.filter(Boolean).map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
      );
    case "checkbox": {
      const disabled = !props.onToggle;
      return (
        <button
          type="button"
          role="checkbox"
          aria-checked={props.checked}
          disabled={disabled}
          onClick={props.onToggle ? (e) => { e.stopPropagation(); props.onToggle!(e); } : undefined}
          className="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 border-[var(--color-border-ui-strong)] bg-[var(--color-surface-card)] aria-checked:border-[var(--color-primary)] aria-checked:bg-[var(--color-primary)]"
        >
          {props.checked && (
            <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </button>
      );
    }
  }
}

// ─── Column config for managed tables ─────────────────────────────────────────

export type TableColumnConfig<T> = {
  header: string | ReactNode;
  renderCell: (item: T) => TableCellProps;
  sortKey?: string;
  sortValue?: (item: T) => string | number;
};

export type TableViewConfig<T> = {
  type: "table";
  columns: TableColumnConfig<T>[];
  variant?: "data";
  stableColumnLayout?: boolean;
  columnFlexWeights?: readonly number[];
  columnNoWrap?: readonly boolean[];
  /** Extra CSS classes applied to every cell (th + td) in the column at that index. */
  columnClass?: readonly (string | undefined)[];
  onRowClick?: (item: T) => void;
};

// ─── Internal table styling ────────────────────────────────────────────────────

const tableSurface =
  "w-full min-w-0 overflow-hidden rounded-[var(--table-radius)] border border-[var(--table-border-row)]";
const tableXScroll = "table-x-scroll min-w-0 w-full max-w-full";
const dataTableBase = "border-collapse text-left";
const rowBorder = "border-b border-[var(--table-border-row)]";
const headerCell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] font-medium text-[var(--table-header-text)] bg-[var(--table-header-bg)]";
const cell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-[var(--table-body-text)] bg-[var(--table-row-bg)]";
const kvTableShell = "table-key-value-shell min-w-0 w-full max-w-full";
const kvTableBase = "table-key-value w-full table-fixed border-collapse text-left";
const kvHeaderCell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] font-[600] text-[var(--table-header-text)] bg-[var(--table-header-bg)]";

// ─── DataTable ─────────────────────────────────────────────────────────────────

function DataTable({
  headers,
  dataRows,
  stableColumnLayout = true,
  columnNoWrap,
  rowGroupBreakBefore,
  onRowClick,
  sortConfig,
  columnClass,
}: DataTableProps & { columnClass?: readonly (string | undefined)[] }) {
  const { shouldCenter, widthsCh } = computeColumnMeta(headers ?? [], dataRows ?? []);

  const colgroup =
    !headers || headers.length === 0
      ? null
      : stableColumnLayout
        ? (
            <colgroup>
              {headers.map((_, j) => {
                const w = widthsCh[j];
                if (!w) return <col key={`col-${j}`} />;
                return <col key={`col-${j}`} style={{ width: w, minWidth: w, maxWidth: w, boxSizing: "border-box" }} />;
              })}
            </colgroup>
          )
        : null;

  const tableClass = `${dataTableBase} table-data${stableColumnLayout ? " table-data--layout-stable" : ""}`.trim();
  const tableStyle = stableColumnLayout ? ({ width: "max-content", minWidth: "100%" } as const) : undefined;

  return (
    <div className={tableSurface}>
      <div className={tableXScroll}>
        <table className={tableClass} style={tableStyle}>
          {colgroup}
          {headers && headers.length > 0 && (
            <thead>
              <tr className={rowBorder}>
                {headers.map((h, j) => {
                  const sortKey = sortConfig?.keys[j] ?? null;
                  const isActive = sortKey != null && sortConfig && sortConfig.activeKey === sortKey;
                  const label = (
                    <span className={`${shouldCenter[j] ? "text-center" : "text-left"} whitespace-nowrap`}>
                      {h}
                    </span>
                  );
                  return (
                    <th
                      key={`h-${j}`}
                      className={`${headerCell} sticky top-0 z-20 ${shouldCenter[j] ? "text-center" : "text-left"} ${columnClass?.[j] ?? ""}`}
                      aria-sort={
                        sortKey != null && sortConfig
                          ? sortConfig.activeKey === sortKey
                            ? sortConfig.direction === "asc" ? "ascending" : "descending"
                            : "none"
                          : undefined
                      }
                    >
                      {sortKey != null && sortConfig ? (
                        <div
                          className={`flex max-w-full flex-wrap items-center justify-start gap-1.5 font-[600] ${
                            isActive ? "text-[var(--color-primary)]" : "text-[var(--table-header-text)]"
                          }`}
                        >
                          {label}
                          <button
                            type="button"
                            className={`group inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ring-offset-table)] ${
                              isActive ? "text-[var(--color-primary)]" : "text-[var(--table-header-text)]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sortConfig.onSort(sortKey);
                            }}
                            aria-label={`Sort by column ${j + 1}`}
                            aria-pressed={Boolean(isActive)}
                          >
                            <span
                              className={
                                isActive
                                  ? "inline-flex h-4 w-4 items-center justify-center text-[var(--color-primary)]"
                                  : "inline-flex h-4 w-4 items-center justify-center text-[var(--table-header-text)] opacity-60 transition-colors group-hover:text-[var(--color-primary)] group-hover:opacity-100"
                              }
                              aria-hidden
                            >
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isActive && sortConfig.direction === "desc" ? "rotate-180" : ""
                                }`}
                              >
                                <path d="M5 12l5-5 5 5" />
                              </svg>
                            </span>
                          </button>
                        </div>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}
          <tbody>
            {(dataRows ?? []).map((cells, i) => (
              <tr
                key={i}
                className={`${rowBorder} ${rowGroupBreakBefore?.(i) ? "is-table-row-group-start" : ""}`}
                data-clickable={onRowClick ? "true" : undefined}
                onClick={onRowClick ? () => onRowClick(cells, i) : undefined}
              >
                {cells.map((c, j) => {
                  const nowrap = columnNoWrap?.[j] === true;
                  const alignClass = shouldCenter[j] ? "text-center" : "text-left";
                  return (
                    <td
                      key={j}
                      className={`${cell} ${alignClass} ${nowrap ? "whitespace-nowrap" : "whitespace-normal break-words"} ${columnClass?.[j] ?? ""}`}
                    >
                      {c}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KeyValueTable ─────────────────────────────────────────────────────────────

function KeyValueTable({ rows, alignTop }: { rows: readonly KeyValueTableRow[]; alignTop?: boolean }) {
  const topAlignClass = alignTop === false ? "" : "align-top";
  return (
    <div className={tableSurface}>
      <div className={kvTableShell}>
        <table className={kvTableBase}>
          <colgroup>
            <col style={{ width: "var(--table-kv-key-col-pct)" }} />
            <col style={{ width: "var(--table-kv-value-col-pct)" }} />
          </colgroup>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`kv-${rowIndex}-${row.label}`} className={rowBorder}>
                <th scope="row" className={`${kvHeaderCell} whitespace-normal break-words ${topAlignClass}`}>
                  {!isKeyValueListRow(row) && row.labelHref ? (
                    <a
                      href={row.labelHref}
                      target={row.labelTarget ?? "_self"}
                      rel={row.labelTarget === "_blank" ? "noreferrer" : undefined}
                      className="link-default"
                    >
                      {row.label}
                    </a>
                  ) : (
                    row.label
                  )}
                </th>
                <td className={`${cell} break-words whitespace-normal ${topAlignClass}`}>
                  {isKeyValueListRow(row) ? (
                    row.items.length === 1 ? (
                      <span>{row.items[0]}</span>
                    ) : (
                      <ul className="list-outside list-disc w-full">
                        {row.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    )
                  ) : (
                    <>
                      <div>
                        {"href" in row && row.href ? (
                          <a href={row.href} target="_blank" rel="noreferrer" className="link-default">
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </div>
                      {row.valueLine2 && <div className="mt-1">{row.valueLine2}</div>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Table (static variant) ────────────────────────────────────────────────────

export function Table(props: TableProps) {
  if (props.variant === "data") return <DataTable {...props} />;
  return <KeyValueTable rows={props.rows} alignTop={props.alignTop} />;
}

// ─── TableView (managed: column configs + sort state) ──────────────────────────

export function TableView<T>({
  items,
  columns,
  variant = "data",
  stableColumnLayout,
  columnFlexWeights,
  columnNoWrap,
  columnClass,
  onRowClick,
}: TableViewConfig<T> & { items: T[] }) {
  const [activeSortKey, setActiveSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedItems = useMemo(() => {
    if (!activeSortKey) return items;
    const col = columns.find((c) => c.sortKey === activeSortKey);
    if (!col?.sortValue) return items;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [items, activeSortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (activeSortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setActiveSortKey(key); setSortDir("asc"); }
  };

  const sortKeys = columns.map((c) => c.sortKey ?? null);

  return (
    <DataTable
      variant={variant}
      headers={columns.map((c) => c.header)}
      stableColumnLayout={stableColumnLayout}
      columnFlexWeights={columnFlexWeights}
      columnNoWrap={columnNoWrap}
      columnClass={columnClass}
      sortConfig={
        sortKeys.some((k) => k !== null)
          ? { activeKey: activeSortKey, direction: sortDir, keys: sortKeys, onSort: handleSort }
          : undefined
      }
      onRowClick={onRowClick ? (_, i) => onRowClick(sortedItems[i]) : undefined}
      dataRows={sortedItems.map((item) =>
        columns.map((col) => <TableCell {...col.renderCell(item)} />)
      )}
    />
  );
}

export type {
  DataTableSortConfig,
  DataTableRow,
  KeyValueListRow,
  KeyValueRow,
  KeyValueTableRow,
  TableProps,
} from "./tableTypes";
