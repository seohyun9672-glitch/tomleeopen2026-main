import { cn } from "@/lib/utils";

export type ChipProps = {
  label: string;
  size?: "sm" | "md";
  shape?: "circular" | "rounded";
  className?: string;
  "aria-label"?: string;
};

const SIZES: Record<NonNullable<ChipProps["size"]>, string> = {
  sm: "inline-flex px-2 py-0.5 text-xs w-fit",
  md: "inline-flex px-2 py-1 text-sm w-fit",
};
const SHAPES: Record<NonNullable<ChipProps["shape"]>, string> = {
  circular: "rounded-full",
  rounded:  "rounded-xl",
};

export function Chip({ label, size = "md", shape = "circular", className, "aria-label": ariaLabel }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-block border",
        "bg-[var(--color-surface-strong)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]",
        SIZES[size], SHAPES[shape],
        className,
      )}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  );
}
