import { DataTable } from "./DataTable";
import { KeyValueTable } from "./KeyValueTable";
import { TableCell } from "./tableCells";
import type { TableProps } from "./tableTypes";

function TableBase(props: TableProps) {
  if (props.variant === "data") return <DataTable {...props} />;
  return <KeyValueTable {...props} />;
}

TableBase.Cell = TableCell;

export { TableBase as Table };

export type {
  DataTableSortConfig,
  DataTableRow,
  KeyValueListRow,
  KeyValueRow,
  KeyValueTableRow,
  TableProps,
} from "./tableTypes";
