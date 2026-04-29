import type { ReactNode } from "react";
import { Chip } from "../Chip";

const DATA_CHIP_SHELL =
  "inline-flex max-w-full min-w-0 shrink items-center rounded-2xl border border-[color:var(--chip-palette-ring)] px-2.5 py-1 text-left text-inherit font-medium leading-snug whitespace-normal [overflow-wrap:break-word] [word-break:break-word]";

type ChipItem = { label: string; className: string; title?: string };

type TableCellProps =
  | { type: "chips"; items: ChipItem[] }
  | { type: "players"; text?: string | null; splitSemicolons?: boolean }
  | { type: "match-scores"; lines: string[] }
  | { type: "technical-id"; children: ReactNode }
  | { type: "icon-center"; children: ReactNode };

function SlashGroup({ segment, isSolo }: { segment: string; isSolo: boolean }): ReactNode {
  const parts = segment.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length <= 1) return <span className="table-stacked-players-line">{segment}</span>;
  return (
    <span className={isSolo ? "table-stacked-players-split" : "table-stacked-players-split table-stacked-players-split--nested"}>
      {parts.map((p, i) => (
        <span key={i} className="table-stacked-players-line">{p}</span>
      ))}
    </span>
  );
}

export function TableCell(props: TableCellProps): ReactNode {
  switch (props.type) {
    case "chips":
      return (
        <span className="table-data-chip-group">
          {props.items.map((item, i) => (
            <Chip
              key={i}
              className={`${DATA_CHIP_SHELL} ${item.className}`.trim()}
              label={item.label}
              title={item.title}
            />
          ))}
        </span>
      );
    case "players": {
      const raw = props.text?.trim();
      if (!raw || raw === "—") return "—";
      const segments =
        props.splitSemicolons && raw.includes(";")
          ? raw.split(/\s*;\s*/).filter(Boolean)
          : [raw];
      if (segments.length === 1) {
        return (
          <span className="table-stacked-players-root">
            <SlashGroup segment={segments[0]!} isSolo />
          </span>
        );
      }
      return (
        <span className="table-stacked-players-multi">
          {segments.map((seg, i) => (
            <SlashGroup key={i} segment={seg} isSolo={false} />
          ))}
        </span>
      );
    }
    case "match-scores":
      if (props.lines.length === 0) return "—";
      return (
        <span className="table-match-scores-stack">
          {props.lines.map((line, i) => (
            <span key={i} className="table-match-scores-stack-line">{line}</span>
          ))}
        </span>
      );
    case "technical-id":
      return <span className="table-cell-technical-id">{props.children}</span>;
    case "icon-center":
      return <div className="table-cell-icon-center">{props.children}</div>;
  }
}
