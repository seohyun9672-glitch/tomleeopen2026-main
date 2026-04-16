import type { DataTableProps } from "./tableTypes";
import { computeColumnMeta } from "./tableColumnUtils";

const tableSurface =
  "w-full min-w-0 overflow-hidden rounded-[var(--table-radius)] border border-[var(--table-border-row)]";
const tableXScroll = "table-x-scroll min-w-0 w-full max-w-full";
const dataTableBase = "border-collapse text-left";
const rowBorder = "border-b border-[var(--table-border-row)]";
const headerCell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] font-medium text-[var(--table-header-text)] bg-[var(--table-header-bg)]";
const cell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-[var(--table-body-text)] bg-[var(--table-row-bg)]";

export function DataTable(props: DataTableProps) {
  const {
    headers,
    dataRows,
    stableColumnLayout = true,
    columnNoWrap,
    rowGroupBreakBefore,
    onRowClick,
    sortConfig,
  } = props;
  const { shouldCenter, widthsCh } = computeColumnMeta(headers, dataRows);

  const colgroup =
    headers.length === 0
      ? null
      : stableColumnLayout
        ? (() => (
            <colgroup>
              {headers.map((_, j) => {
                const w = widthsCh[j];
                if (!w) return <col key={`col-${j}`} />;
                return <col key={`col-${j}`} style={{ width: w, minWidth: w, maxWidth: w, boxSizing: "border-box" }} />;
              })}
            </colgroup>
          ))()
        : null;

  const tableClass = `${dataTableBase} table-data${stableColumnLayout ? " table-data--layout-stable" : ""}`.trim();
  const tableStyle = stableColumnLayout ? ({ width: "max-content", minWidth: "100%" } as const) : undefined;

  return (
    <div className={tableSurface}>
      <div className={tableXScroll}>
        <table className={tableClass} style={tableStyle}>
          {colgroup}
          {headers.length > 0 && (
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
                      className={`${headerCell} sticky top-0 z-20 ${shouldCenter[j] ? "text-center" : "text-left"}`}
                      aria-sort={
                        sortKey != null && sortConfig
                          ? sortConfig.activeKey === sortKey
                            ? sortConfig.direction === "asc"
                              ? "ascending"
                              : "descending"
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
            {dataRows.map((cells, i) => (
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
                      className={`${cell} ${alignClass} ${nowrap ? "whitespace-nowrap" : "whitespace-normal break-words"}`}
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
