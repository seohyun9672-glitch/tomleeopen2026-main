import { cn } from "@/lib/utils";

type DividerProps = {
  className?: string;
};

/**
 * Full-width horizontal rule. Colour: `--divider-color` → `--color-border-subtle` by default (see globals).
 */
export function Divider({ className }: DividerProps) {
  return (
    <div
      className={cn("h-px w-full shrink-0 bg-[color:var(--divider-color)]", className)}
      aria-hidden
    />
  );
}
