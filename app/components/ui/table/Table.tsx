import { DataTable } from "./DataTable";
import { KeyValueTable } from "./KeyValueTable";
import type { TableProps } from "./tableTypes";

export function Table(props: TableProps) {
  if (props.variant === "data") return <DataTable {...props} />;
  return <KeyValueTable {...props} />;
}

export type {
  DataTableSortConfig,
  DataTableRow,
  KeyValueListRow,
  KeyValueRow,
  KeyValueTableRow,
  TableProps,
} from "./tableTypes";
