import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  categoryChipClass,
  clubChipClass,
  dataChipStatusChipSurfaceClass,
  matchStatusLooseToDataChipVariant,
  matchStatusToDataChipVariant,
  type DataChipStatusVariant,
} from "@/lib/ui/dataChipPresets";

export type { DataChipStatusVariant, TableDataChipTone } from "@/lib/ui/dataChipPresets";
export {
  matchStatusLooseToDataChipVariant as matchStatusToChipToneLoose,
  matchStatusToDataChipVariant as matchStatusToChipTone,
} from "@/lib/ui/dataChipPresets";

const DATA_CHIP_SHELL =
  "inline-flex max-w-full min-w-0 shrink items-center rounded-2xl border border-[color:var(--chip-palette-ring)] px-2.5 py-1 text-left text-inherit font-medium leading-snug whitespace-normal [overflow-wrap:break-word] [word-break:break-word]";

export type ChipProps = {
  label: string;
  className?: string;
  title?: string;
};

export function Chip({ label, className = "", title }: ChipProps) {
  return (
    <div className={className} title={title}>
      {label}
    </div>
  );
}

type ChipTone = "neutral" | "accent";

function chipClass(active: boolean, tone: ChipTone): string {
  if (tone === "accent") {
    return active
      ? "bg-[var(--primary)] text-[var(--button-on-accent-text)]"
      : "text-[color:var(--chip-accent-text-inactive)] hover:bg-[color:var(--chip-accent-hover-bg)] hover:text-[color:var(--chip-accent-hover-text)]";
  }
  return active
    ? "border border-[color:var(--chip-palette-ring)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm"
    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";
}

export function ChipButton({
  active,
  children,
  tone = "neutral",
  className = "",
  ...props
}: {
  active: boolean;
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex min-h-10 max-h-none max-w-full min-w-0 shrink items-center justify-center rounded-full px-4 py-2 text-center text-sm font-medium whitespace-nowrap transition-colors ${chipClass(active, tone)} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

type CategoryChipProps = {
  variant: "category";
  categoryId: string;
  title?: string;
  children: ReactNode;
};

type ClubChipProps = {
  variant: "club";
  clubCode: string;
  title?: string;
  children?: ReactNode;
};

type StatusChipProps = {
  variant: "status";
  tone: DataChipStatusVariant;
  title?: string;
  children: ReactNode;
};

export type TableDataChipProps = CategoryChipProps | ClubChipProps | StatusChipProps;

function labelFromChildren(children: ReactNode | undefined, fallback: string): string {
  if (children == null || children === false) return fallback;
  if (typeof children === "string" || typeof children === "number") return String(children);
  return fallback;
}

export function TableDataChip(props: TableDataChipProps) {
  if (props.variant === "category") {
    const { categoryId, title, children } = props;
    const label = labelFromChildren(children, categoryId);
    return (
      <Chip
        className={`${DATA_CHIP_SHELL} ${categoryChipClass(categoryId)}`.trim()}
        title={title ?? categoryId}
        label={label}
      />
    );
  }
  if (props.variant === "club") {
    const { clubCode, title, children } = props;
    const label = labelFromChildren(children, clubCode);
    return (
      <Chip
        className={`${DATA_CHIP_SHELL} ${clubChipClass(clubCode)}`.trim()}
        title={title ?? clubCode}
        label={label}
      />
    );
  }
  const { tone, title, children } = props;
  const label = labelFromChildren(children, "—");
  return (
    <Chip
      className={`${DATA_CHIP_SHELL} ${dataChipStatusChipSurfaceClass(tone)}`.trim()}
      title={title}
      label={label}
    />
  );
}

export function TableDataChipGroup({ children }: { children: ReactNode }) {
  return <span className="table-data-chip-group">{children}</span>;
}

export function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  const tone = matchStatusLooseToDataChipVariant(status);
  const label = status.trim() || "—";
  return (
    <Chip
      className={`${DATA_CHIP_SHELL} ${dataChipStatusChipSurfaceClass(tone)} ${className}`.trim()}
      label={label}
    />
  );
}
