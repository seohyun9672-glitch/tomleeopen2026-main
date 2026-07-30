"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardViewProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  /** Group items by a string key — groups render in insertion order. */
  groupBy?: (item: T) => string;
  renderGroupHeader?: (groupKey: string) => ReactNode;
  /**
   * Tailwind grid classes applied to the items grid.
   * Default: single-column list (`grid-cols-1`).
   * Example for a responsive card grid:
   *   "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
   */
  gridClass?: string;
  /** Gap between grid items. Default: content-gap. */
  gap?: string;
  /** Gap between groups when groupBy is used. Default: section-gap. */
  groupGap?: string;
  /** Gap between a group header and its grid. Default: element-gap. */
  headerGap?: string;
  className?: string;
};

function buildGroups<T>(
  items: T[],
  groupBy: (item: T) => string,
): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = groupBy(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()].map(([key, groupItems]) => ({ key, items: groupItems }));
}

export function CardView<T>({
  items,
  getKey,
  renderItem,
  groupBy,
  renderGroupHeader,
  gridClass = "grid-cols-1",
  gap = "gap-[var(--content-gap)]",
  groupGap = "gap-[var(--section-gap)]",
  headerGap = "gap-[var(--element-gap)]",
  className,
}: CardViewProps<T>) {
  const grid = (
    <ul className={cn("grid", gridClass, gap)}>
      {items.map((item, index) => (
        <li key={getKey(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );

  if (!groupBy) {
    return <div className={className}>{grid}</div>;
  }

  const groups = buildGroups(items, groupBy);
  return (
    <div className={cn("flex flex-col", groupGap, className)}>
      {groups.map(({ key, items: groupItems }) => (
        <div key={key} className={cn("flex flex-col", headerGap)}>
          {renderGroupHeader?.(key)}
          <ul className={cn("grid", gridClass, gap)}>
            {groupItems.map((item, index) => (
              <li key={getKey(item)}>{renderItem(item, index)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
