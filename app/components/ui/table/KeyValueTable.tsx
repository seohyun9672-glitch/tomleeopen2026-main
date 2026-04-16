import type { KeyValueTableProps } from "./tableTypes";
import { isKeyValueListRow } from "./tableTypes";

const tableSurface =
  "w-full min-w-0 overflow-hidden rounded-[var(--table-radius)] border border-[var(--table-border-row)]";
const keyValueTableShell = "table-key-value-shell min-w-0 w-full max-w-full";
const keyValueTableBase = "table-key-value w-full table-fixed border-collapse text-left";
const rowBorder = "border-b border-[var(--table-border-row)]";
const headerCell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] font-[600] text-[var(--table-header-text)] bg-[var(--table-header-bg)]";
const cell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-[var(--table-body-text)] bg-[var(--table-row-bg)]";

export function KeyValueTable({ rows, alignTop }: KeyValueTableProps) {
  const topAlignClass = alignTop === false ? "" : "align-top";
  return (
    <div className={tableSurface}>
      <div className={keyValueTableShell}>
        <table className={keyValueTableBase}>
          <colgroup>
            <col style={{ width: "var(--table-kv-key-col-pct)" }} />
            <col style={{ width: "var(--table-kv-value-col-pct)" }} />
          </colgroup>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`kv-${rowIndex}-${row.label}`} className={rowBorder}>
                <th scope="row" className={`${headerCell} whitespace-normal break-words ${topAlignClass}`}>
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
                    <ul className="list-outside list-disc w-full">
                      {row.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
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
