"use client";
import { useMemo } from "react";
import type { PrelimsLeaderboardRow } from "@/lib/prelimsLeaderboard";
import { useLocale } from "@/lib/locale-context";

/** Match shared Table `variant="data"` shell (classes only; no global overrides). */
const tableSurface =
  "w-full min-w-0 overflow-hidden rounded-[var(--table-radius)] border border-[var(--table-border-row)]";
const tableXScroll = "table-x-scroll min-w-0 w-full max-w-full";
const rowBorder = "border-b border-[var(--table-border-row)]";
const headerCell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] font-[600] text-[var(--table-header-text)] bg-[var(--table-header-bg)]";
const cell =
  "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-[var(--table-body-text)] bg-[var(--table-row-bg)]";

type Props = {
  rankHeader: string;
  playersHeader: string;
  wHeader: string;
  lHeader: string;
  sdHeader: string;
  gdHeader: string;
  rows: PrelimsLeaderboardRow[];
};

/** Prelims standings only: local `<colgroup>`; no `%` widths; does not use the shared Table component. */
export function PrelimsLeaderboardTable({
  rankHeader,
  playersHeader,
  wHeader,
  lHeader,
  sdHeader,
  gdHeader,
  rows,
}: Props) {
  const { locale } = useLocale();

  const rankWidth = useMemo(() => {
    let longest = Math.max(1, [...rankHeader].length);
    for (const r of rows) {
      const len = String(r.rank).length;
      if (len > longest) longest = len;
    }
    return `${longest + 1}ch`;
  }, [rows, rankHeader]);

  const statWidth = useMemo(() => {
    let longest = Math.max(
      1,
      [...wHeader].length,
      [...lHeader].length,
      [...sdHeader].length,
      [...gdHeader].length
    );
    for (const r of rows) {
      for (const v of [r.w, r.l, r.sd, r.gd]) {
        const len = String(v).length;
        if (len > longest) longest = len;
      }
    }
    return `${longest + 1}ch`;
  }, [rows, wHeader, lHeader, sdHeader, gdHeader]);

  const headers = [rankHeader, playersHeader, wHeader, lHeader, sdHeader, gdHeader];
  const isNumericCol = (idx: number) => idx !== 1;

  return (
    <div className={tableSurface}>
      <div className={tableXScroll}>
        <table
          className="table-data w-max min-w-full border-collapse text-left"
        >
          <colgroup>
            <col style={{ width: rankWidth, minWidth: rankWidth, maxWidth: rankWidth, boxSizing: "border-box" }} />
            <col />
            <col style={{ width: statWidth, minWidth: statWidth, maxWidth: statWidth, boxSizing: "border-box" }} />
            <col style={{ width: statWidth, minWidth: statWidth, maxWidth: statWidth, boxSizing: "border-box" }} />
            <col style={{ width: statWidth, minWidth: statWidth, maxWidth: statWidth, boxSizing: "border-box" }} />
            <col style={{ width: statWidth, minWidth: statWidth, maxWidth: statWidth, boxSizing: "border-box" }} />
          </colgroup>
          <thead>
            <tr className={rowBorder}>
              {headers.map((h, j) => (
                <th
                  key={j}
                  className={`${headerCell} sticky top-0 z-20 ${isNumericCol(j) ? "text-center" : "text-left"}`}
                  scope="col"
                >
                  <span className="whitespace-nowrap">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const namePairs: [string, string | undefined][] = [
                [r.player1, r.player1Ko],
              ];
              if (r.player2) namePairs.push([r.player2, r.player2Ko]);
              return (
                <tr key={r.teamId} className={rowBorder}>
                  <td className={`${cell} whitespace-nowrap text-center tabular-nums`}>{r.rank}</td>
                  <td className={`${cell} whitespace-nowrap text-left align-top`}>
                    <span className="table-stacked-players-root">
                      {namePairs.map(([en, ko], i) => {
                        const name = locale === "ko" ? (ko ?? en) : en;
                        return (
                          <span
                            key={`${r.teamId}-p-${i}`}
                            className="table-stacked-players-line overflow-visible text-clip"
                          >
                            {name}
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td className={`${cell} whitespace-nowrap text-center tabular-nums`}>{r.w}</td>
                  <td className={`${cell} whitespace-nowrap text-center tabular-nums`}>{r.l}</td>
                  <td className={`${cell} whitespace-nowrap text-center tabular-nums`}>{r.sd}</td>
                  <td className={`${cell} whitespace-nowrap text-center tabular-nums`}>{r.gd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
