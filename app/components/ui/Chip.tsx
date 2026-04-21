import type { ButtonHTMLAttributes, ReactNode } from "react";

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

export type TableDataChipProps = {
  label: string;
  className: string;
  title?: string;
};

export function TableDataChip({ label, className, title }: TableDataChipProps) {
  return (
    <Chip
      className={`${DATA_CHIP_SHELL} ${className}`.trim()}
      title={title}
      label={label}
    />
  );
}

export function TableDataChipGroup({ children }: { children: ReactNode }) {
  return <span className="table-data-chip-group">{children}</span>;
}
