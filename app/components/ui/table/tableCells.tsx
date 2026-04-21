import type { ReactNode } from "react";

export { TableDataChip, TableDataChipGroup } from "../Chip";

// -- Layout primitives ---------------------------------------------------------

export function TableCellStack({ children }: { children: ReactNode }) {
  return <div className="table-cell-stack">{children}</div>;
}

export function TableCellStackItem({ children }: { children: ReactNode }) {
  return <span className="table-cell-stack-item">{children}</span>;
}

export function TableCellIconCenter({ children }: { children: ReactNode }) {
  return <div className="table-cell-icon-center">{children}</div>;
}

export function TableTechnicalIdCell({ children }: { children: ReactNode }) {
  return <span className="table-cell-technical-id">{children}</span>;
}

// -- Match / score layout -----------------------------------------------------

export function TableScoreSummaryCell({ children }: { children: ReactNode }) {
  return <span className="table-cell-score-line">{children}</span>;
}

export function TableMatchScoresStacked({ lines }: { lines: string[] }) {
  if (lines.length === 0) return "—";
  return (
    <span className="table-match-scores-stack">
      {lines.map((line, i) => (
        <span key={i} className="table-match-scores-stack-line">
          {line}
        </span>
      ))}
    </span>
  );
}

// -- Player / member names -----------------------------------------------------

type BilingualMember = { fullNameEn: string; fullNameKo: string | null };

export function TableDrawMemberCell({ member }: { member: BilingualMember | null }) {
  if (!member) return "—";
  return (
    <span className="table-member-names">
      <span className="table-member-names-primary">{member.fullNameEn}</span>
      {member.fullNameKo ? <span className="table-member-names-secondary">{member.fullNameKo}</span> : null}
    </span>
  );
}

type TableStackedPlayersCellProps = {
  text: string | null | undefined;
  splitSemicolons?: boolean;
};

function SlashGroup({ segment, isSolo }: { segment: string; isSolo: boolean }): ReactNode {
  const parts = segment.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length <= 1) return <span className="table-stacked-players-line">{segment}</span>;
  return (
    <span className={isSolo ? "table-stacked-players-split" : "table-stacked-players-split table-stacked-players-split--nested"}>
      {parts.map((p, i) => (
        <span key={i} className="table-stacked-players-line">
          {p}
        </span>
      ))}
    </span>
  );
}

export function TableStackedPlayersCell({
  text,
  splitSemicolons = false,
}: TableStackedPlayersCellProps): ReactNode {
  const raw = text?.trim();
  if (!raw || raw === "—") return "—";
  const segments = splitSemicolons && raw.includes(";") ? raw.split(/\s*;\s*/).filter(Boolean) : [raw];
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

export function TablePlayerDirectoryNameCell({ primary }: { primary: string }) {
  return <span className="table-player-name-primary">{primary}</span>;
}
