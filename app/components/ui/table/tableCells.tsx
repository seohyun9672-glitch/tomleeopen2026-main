import type { ReactNode } from "react";

import { matchStatusToChipTone, TableDataChip, TableDataChipGroup } from "../Chip";

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

// -- Match / status ------------------------------------------------------------

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

export function TableMatchStatusPill({ status, label }: { status: string; label?: string }) {
  const tone = matchStatusToChipTone(status);
  return (
    <TableDataChipGroup>
      <TableDataChip variant="status" tone={tone}>
        {label ?? status}
      </TableDataChip>
    </TableDataChipGroup>
  );
}

export function TableRegistrationStatusCell({
  statusLine,
  variant,
  showRefundNote,
  refundNoteText,
}: {
  statusLine: string;
  variant: "cancelled" | "active";
  showRefundNote?: boolean;
  refundNoteText?: string;
}) {
  const refundLine = refundNoteText ?? "Refund in notes — shown as cancelled.";
  return (
    <TableCellStack>
      <TableDataChipGroup>
        <TableDataChip variant="status" tone={variant === "cancelled" ? "reg-cancelled" : "reg-active"}>
          {statusLine}
        </TableDataChip>
      </TableDataChipGroup>
      {showRefundNote ? <span className="table-data-pill-note">{refundLine}</span> : null}
    </TableCellStack>
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

// -- Chips --------------------------------------------------------------------

export function TableCategoryChipsCell({ items }: { items: { id: string; label: string }[] }) {
  if (items.length === 0) return "—";
  return (
    <TableDataChipGroup>
      {items.map((item) => (
        <TableDataChip key={item.id} variant="category" categoryId={item.id} title={item.id}>
          {item.label}
        </TableDataChip>
      ))}
    </TableDataChipGroup>
  );
}

export function TableClubsChipsCell({ clubs, rowKey }: { clubs: string[]; rowKey: string }) {
  if (clubs.length === 0) return "—";
  return (
    <TableDataChipGroup>
      {clubs.map((clubCode) => (
        <TableDataChip key={`${rowKey}-${clubCode}`} variant="club" clubCode={clubCode} />
      ))}
    </TableDataChipGroup>
  );
}

export function TablePlayerClubsCell({ clubs, playerId }: { clubs: string[]; playerId: number }) {
  if (clubs.length === 0) return "—";
  return (
    <TableDataChipGroup>
      {clubs.map((clubCode) => (
        <TableDataChip key={`${playerId}-${clubCode}`} variant="club" clubCode={clubCode} />
      ))}
    </TableDataChipGroup>
  );
}

export function TablePlayerDirectoryNameCell({ primary }: { primary: string }) {
  return <span className="table-player-name-primary">{primary}</span>;
}

export {
  TableDataChip,
  TableDataChipGroup,
  matchStatusToChipTone,
  type TableDataChipTone,
  type TableDataChipProps,
} from "../Chip";
