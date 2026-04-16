import type { ReactNode } from "react";

export type KeyValueRow = {
  label: string;
  labelHref?: string;
  labelTarget?: "_blank" | "_self";
  value: string | ReactNode;
  valueLine2?: string;
  href?: string;
};

export type KeyValueListRow = {
  label: string;
  items: readonly ReactNode[];
};

export type KeyValueTableRow = KeyValueRow | KeyValueListRow;

export type DataTableRow = (string | ReactNode)[];

export type DataTableSortConfig = {
  activeKey: string | null;
  direction: "asc" | "desc";
  keys: readonly (string | null)[];
  onSort: (key: string) => void;
};

export type DataTableProps = {
  variant: "data";
  headers: readonly (string | ReactNode)[];
  dataRows: readonly DataTableRow[];
  stableColumnLayout?: boolean;
  columnFlexWeights?: readonly number[];
  columnNoWrap?: readonly boolean[];
  rowGroupBreakBefore?: (rowIndex: number) => boolean;
  onRowClick?: (cells: DataTableRow, rowIndex: number) => void;
  sortConfig?: DataTableSortConfig;
  rows?: never;
  alignTop?: never;
};

export type KeyValueTableProps = {
  variant: "key-value";
  rows: readonly KeyValueTableRow[];
  alignTop?: boolean;
  headers?: never;
  dataRows?: never;
  rowGroupBreakBefore?: never;
  onRowClick?: never;
};

export type TableProps = DataTableProps | KeyValueTableProps;

export function isKeyValueListRow(row: KeyValueTableRow): row is KeyValueListRow {
  return "items" in row && Array.isArray(row.items);
}
