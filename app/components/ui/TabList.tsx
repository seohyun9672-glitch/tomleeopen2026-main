"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Divider } from "./Divider";

/** Tab row link: same look as the old `ChipLink` with `tone="accent"` (pill, primary fill when active). */
const tabButtonBaseClass =
  "inline-flex min-h-10 max-h-none max-w-full min-w-0 shrink items-center justify-center rounded-full px-4 py-2 text-center text-sm font-medium whitespace-nowrap transition-colors";

function tabButtonAccentSurfaceClass(active: boolean) {
  return active
    ? "bg-[var(--primary)] text-[var(--button-on-accent-text)] font-semibold"
    : "font-normal text-[color:var(--chip-accent-text-inactive)] hover:bg-[color:var(--chip-accent-hover-bg)] hover:text-[color:var(--chip-accent-hover-text)]";
}

function TabButton({
  href,
  onClick,
  active,
  children,
  className = "",
}: {
  href?: ComponentProps<typeof Link>["href"];
  onClick?: () => void;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  const classes = cn(tabButtonBaseClass, tabButtonAccentSurfaceClass(active), className);
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href ?? "?"} scroll={false} className={classes}>
      {children}
    </Link>
  );
}

export type TabItem = {
  value: string;
  label: string;
  href?: string;
};

type TabListProps = {
  /** List of tabs; value is the key, label is the visible text */
  tabs: TabItem[];
  /** Currently active tab value */
  value: string;
  /** Build href for each tab (e.g. from URLSearchParams). Optional when each tab includes `href`. */
  getHref?: (value: string) => string;
  /** When provided, tabs render as buttons instead of links and call this on click. */
  onSelect?: (value: string) => void;
  /** Layout variant for the tab row wrapper (both use the same flex classes today; kept for API stability). */
  variant?: "default" | "inline";
  /** Optional extra wrapper class */
  className?: string;
  /** Extra classes for {@link Divider} below the tab row. */
  dividerClassName?: string;
};

const wrapperClass = {
  default: "flex flex-nowrap overflow-x-auto gap-2 md:flex-wrap md:overflow-visible",
  inline: "flex flex-nowrap overflow-x-auto gap-2 md:flex-wrap md:overflow-visible",
};

/**
 * Horizontal list of tab links. Active tab uses yellow primary background.
 * Use for view switchers (Draw/Matches/Results), filters (Articles/Videos/Photos), etc.
 */
export function TabList({
  tabs,
  value,
  getHref,
  onSelect,
  variant = "default",
  className = "",
  dividerClassName = "bg-[color:var(--color-border-ui)]",
}: TabListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabWrapRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeIndex = useMemo(() => tabs.findIndex((t) => t.value === value), [tabs, value]);

  const bringTabIntoView = useCallback((targetIndex: number, behavior: ScrollBehavior) => {
    const container = listRef.current;
    const target = tabWrapRefs.current[targetIndex];
    if (!container || !target) return;

    const left = target.offsetLeft;
    const right = left + target.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    const margin = 4;

    if (left < viewLeft + margin) {
      container.scrollTo({ left: Math.max(0, left - margin), behavior });
      return;
    }
    if (right > viewRight - margin) {
      container.scrollTo({
        left: Math.max(0, right - container.clientWidth + margin),
        behavior,
      });
    }
  }, []);

  // Keep active tab fully visible when selection or tab set changes.
  useEffect(() => {
    if (activeIndex < 0) return;
    const id = window.setTimeout(() => bringTabIntoView(activeIndex, "auto"), 0);
    return () => window.clearTimeout(id);
  }, [activeIndex, tabs.length, bringTabIntoView]);

  return (
    <div className={`w-full ${className}`.trim()}>
      <div ref={listRef} className={wrapperClass[variant]}>
        {tabs.map((tab, i) => (
          <div
            key={tab.value}
            ref={(node) => {
              tabWrapRefs.current[i] = node;
            }}
            className="shrink-0"
          >
            <TabButton
              href={onSelect ? undefined : (tab.href ?? getHref?.(tab.value) ?? "?")}
              onClick={onSelect ? () => onSelect(tab.value) : undefined}
              active={value === tab.value}
            >
              {tab.label}
            </TabButton>
          </div>
        ))}
      </div>
      <Divider className={cn("mt-3", dividerClassName)} />
    </div>
  );
}

// Backward-compatible alias.
export const TabSwitcher = TabList;
