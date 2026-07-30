import type { ReactNode } from "react";
import type { DataTableRow } from "./tableTypes";

export function headerTextAt(headers: readonly (string | ReactNode)[], j: number): string {
  const h = headers[j];
  if (typeof h === "string") return h;
  if (typeof h === "number") return String(h);
  return "";
}

const STAT_HEADERS = new Set([
  "W", "L", "W-L", "Win%", "SD", "GD",
  "승", "패", "승-패", "승률", "세트차", "게임차",
]);

export function isStatHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim();
  if (!s) return false;
  return STAT_HEADERS.has(s);
}

function isPlayersHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim();
  return s === "Players" || s === "선수";
}

function isTeamsHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim();
  return s === "Teams" || s === "팀";
}

function isPhoneHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim().toLowerCase();
  return s === "phone" || s === "전화" || s === "tel";
}

function isLocationHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim().toLowerCase();
  return s === "location" || s === "장소";
}

function isRankHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  const s = headerTextAt(headers, j).trim();
  return s === "Rank" || s === "순위";
}

export function isNumericByHeader(headers: readonly (string | ReactNode)[], j: number): boolean {
  return isRankHeader(headers, j) || isStatHeader(headers, j);
}

function cellToLen(c: unknown): number {
  if (typeof c === "number") return String(c).length;
  if (typeof c === "string") return c.length;
  return 0;
}

export function numericCol(
  headers: readonly (string | ReactNode)[],
  dataRows: readonly DataTableRow[]
): boolean[] {
  return headers.map((_, j) => {
    if (isPhoneHeader(headers, j)) return false;
    if (isTeamsHeader(headers, j) || isPlayersHeader(headers, j)) return false;
    if (isLocationHeader(headers, j)) return false;
    if (isNumericByHeader(headers, j)) return true;
    for (const row of dataRows) {
      const c = row[j];
      if (typeof c === "number" && Number.isFinite(c)) return true;
      if (typeof c === "string" && /^-?\d+$/.test(c.trim())) return true;
    }
    return false;
  });
}

export function columnShouldCenter(
  headers: readonly (string | ReactNode)[],
  dataRows: readonly DataTableRow[],
  numericByCol: readonly boolean[]
): boolean[] {
  const columnHasAnyNumberType = headers.map((_, j) =>
    dataRows.some((row) => {
      const c = row[j];
      return typeof c === "number" && Number.isFinite(c);
    })
  );
  const columnHasOnlyPrimitiveValues = headers.map((_, j) =>
    dataRows.every((row) => {
      const c = row[j];
      return c == null || typeof c === "string" || typeof c === "number";
    })
  );
  return numericByCol.map(
    (isNumeric, j) =>
      isNumeric &&
      columnHasOnlyPrimitiveValues[j] &&
      (isNumericByHeader(headers, j) || columnHasAnyNumberType[j])
  );
}

export function statGroupWidthCh(
  headers: readonly (string | ReactNode)[],
  dataRows: readonly DataTableRow[],
  numericByCol: readonly boolean[]
): string | null {
  const statIdxs = headers.map((_, i) => i).filter((i) => isStatHeader(headers, i) && numericByCol[i]);
  if (statIdxs.length === 0) return null;
  let maxLen = 1;
  for (const i of statIdxs) {
    maxLen = Math.max(maxLen, headerTextAt(headers, i).trim().length);
    for (const row of dataRows) maxLen = Math.max(maxLen, cellToLen(row[i]));
  }
  return `${maxLen + 1}ch`;
}

export function colWidthsCh(
  headers: readonly (string | ReactNode)[],
  dataRows: readonly DataTableRow[],
  numericByCol: readonly boolean[],
  statWidth: string | null
): Array<string | null> {
  return headers.map((_, j) => {
    if (isPlayersHeader(headers, j)) return null;
    if (statWidth != null && isStatHeader(headers, j) && numericByCol[j]) return statWidth;
    if (!numericByCol[j]) return null;
    let maxLen = Math.max(1, headerTextAt(headers, j).trim().length);
    for (const row of dataRows) maxLen = Math.max(maxLen, cellToLen(row[j]));
    return `${maxLen + 1}ch`;
  });
}

export function computeColumnMeta(
  headers: readonly (string | ReactNode)[],
  dataRows: readonly DataTableRow[]
): { shouldCenter: boolean[]; widthsCh: Array<string | null> } {
  const numericByCol = numericCol(headers, dataRows);
  const shouldCenter = columnShouldCenter(headers, dataRows, numericByCol);
  const statWidth = statGroupWidthCh(headers, dataRows, numericByCol);
  const widthsCh = colWidthsCh(headers, dataRows, numericByCol, statWidth);
  return { shouldCenter, widthsCh };
}
