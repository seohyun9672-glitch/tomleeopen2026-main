"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import {
  Filter,
  YearFilter,
  CategoryFilter,
  RoundFilter,
  GroupFilter,
  ClubFilter,
  StatusFilter,
} from "./Filters";
import { SearchBox } from "@/app/components/ui/SearchBox";
import { ScheduleDatePicker } from "@/app/schedule/ScheduleDatePicker";
import type { Match } from "@/lib/matches";
import { CardView } from "./CardView";
import { TableView } from "@/app/components/ui/table/Table";
import type { TableViewConfig } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";

// ─── Caller-managed filter config types ───────────────────────────────────────
// Hub passes current value + onChange; hub owns the URL param state.

export type DateFilterConfig = {
  type: "date";
  value: string;
  onChange: (v: string) => void;
  matches: Match[];
};

export type YearFilterConfig = {
  type: "year";
  value: string;
  years: number[];
  onChange: (v: string, opts?: { clear?: string[] }) => void;
  allLabel?: string;
};

export type CategoryFilterConfig = {
  type: "category";
  value: string;
  options: { id: string; label: string; labelKo?: string | null }[];
  onChange: (v: string) => void;
  allLabel?: string;
};

export type GroupFilterConfig = {
  type: "group";
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allLabel?: string;
};

export type RoundFilterConfig = {
  type: "round";
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel?: string;
  /** Hide on mobile, show on md+ (renders as display:contents so it joins the flex row). */
  desktopOnly?: boolean;
};

export type SearchFilterConfig = {
  type: "search";
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export type ClubFilterConfig = {
  type: "club";
  selected: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export type StatusFilterConfig = {
  type: "status";
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel?: string;
};

export type FilterConfig =
  | DateFilterConfig
  | YearFilterConfig
  | CategoryFilterConfig
  | GroupFilterConfig
  | RoundFilterConfig
  | SearchFilterConfig
  | ClubFilterConfig
  | StatusFilterConfig;

// ─── Self-managed filter config types ─────────────────────────────────────────
// DatabaseLayout owns the URL param state; hub provides data + param key +
// how to apply the filter. Filters are applied sequentially in array order.

export type ManagedDateFilterConfig<T> = {
  type: "date";
  /** URL search param key. */
  param: string;
  /** Passed to ScheduleDatePicker to show available dates. */
  matches: Match[];
  /** Fallback when the URL param is absent. Receives the full dataset. */
  defaultValue?: (data: T[]) => string;
  apply: (items: T[], date: string) => T[];
};

export type ManagedYearFilterConfig<T> = {
  type: "year";
  param: string;
  years: number[];
  apply: (items: T[], year: string) => T[];
  /** Additional params to clear when this filter changes. */
  clearParams?: string[];
  allLabel?: string;
  /** When true, defaults to showing all years instead of the most recent year. */
  defaultToAll?: boolean;
};

export type ManagedCategoryFilterConfig<T> = {
  type: "category";
  param: string;
  /**
   * Static list or a function that derives options from items already filtered
   * by earlier filters in the array (e.g. year-filtered matches → available categories).
   */
  options:
    | { id: string; label: string; labelKo?: string | null }[]
    | ((prevItems: T[]) => { id: string; label: string; labelKo?: string | null }[]);
  apply: (items: T[], categoryId: string) => T[];
  /**
   * When true, if the current URL value is absent or not in the option list,
   * the first available option is selected automatically.
   */
  autoSelect?: boolean;
  allLabel?: string;
  /** Additional params to clear when this filter changes. */
  clearParams?: string[];
};

export type ManagedSearchFilterConfig<T> = {
  type: "search";
  param: string;
  apply: (items: T[], query: string) => T[];
  className?: string;
};

export type ManagedRoundFilterConfig<T> = {
  type: "round";
  param: string;
  /** Static list or a function derived from items already filtered by earlier filters. */
  options: { value: string; label: string }[] | ((prevItems: T[]) => { value: string; label: string }[]);
  apply: (items: T[], roundCode: string) => T[];
  allLabel?: string;
  desktopOnly?: boolean;
  /** Additional params to clear when this filter changes. */
  clearParams?: string[];
};

export type ManagedGroupFilterConfig<T> = {
  type: "group";
  param: string;
  /** Static list or a function derived from items already filtered by earlier filters. */
  options: string[] | ((prevItems: T[]) => string[]);
  apply: (items: T[], group: string) => T[];
  allLabel?: string;
  /** If provided, group filter is only shown in the filter bar when this returns true. */
  visibleWhen?: (resolvedSoFar: Record<string, string>) => boolean;
};

export type ManagedStatusFilterConfig<T> = {
  type: "status";
  param: string;
  options: { value: string; label: string }[] | ((prevItems: T[]) => { value: string; label: string }[]);
  apply: (items: T[], status: string) => T[];
  allLabel?: string;
};

export type ManagedClubFilterConfig<T> = {
  type: "club";
  param: string;
  options: string[];
  /** Receives the decoded string array (comma-separated in URL). */
  apply: (items: T[], selected: string[]) => T[];
  placeholder?: string;
};

export type ManagedFilterConfig<T> =
  | ManagedDateFilterConfig<T>
  | ManagedYearFilterConfig<T>
  | ManagedCategoryFilterConfig<T>
  | ManagedSearchFilterConfig<T>
  | ManagedRoundFilterConfig<T>
  | ManagedGroupFilterConfig<T>
  | ManagedClubFilterConfig<T>
  | ManagedStatusFilterConfig<T>;

// ─── View config types ─────────────────────────────────────────────────────────

export type CardViewConfig<T> = {
  type: "card";
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  groupBy?: (item: T) => string;
  renderGroupHeader?: (key: string) => ReactNode;
  gridClass?: string;
  gap?: string;
  groupGap?: string;
  headerGap?: string;
  className?: string;
};

/** Same as CardViewConfig but without `items` — items come from filtered data. */
export type ManagedCardViewConfig<T> = Omit<CardViewConfig<T>, "type" | "items">;

// ─── DatabaseLayout props ──────────────────────────────────────────────────────

type SharedProps = {
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  loading?: boolean;
  /** When provided, renders "Total N {label}" below the table. Pass [singular, plural] for correct inflection. */
  rowCountLabel?: string | [string, string];
};

// Caller-managed mode: hub owns filter state, passes pre-filtered data via view.items.
type CallerManagedView<T> = SharedProps & {
  data?: never;
  isEmpty?: boolean;
  filters?: FilterConfig[];
  view: CardViewConfig<T>;
  children?: never;
};
type CallerManagedChildren = SharedProps & {
  data?: never;
  isEmpty?: boolean;
  filters?: FilterConfig[];
  view?: never;
  children: ReactNode;
};

// Self-managed mode: hub passes raw data; DatabaseLayout owns URL param state,
// applies filters, and derives isEmpty automatically.
type ManagedView<T> = SharedProps & {
  data: T[];
  managedFilters?: ManagedFilterConfig<T>[];
  isEmpty?: never;
  filters?: never;
  /** Card layout (fields match CardViewConfig minus items) or table layout. */
  view: ManagedCardViewConfig<T> | TableViewConfig<T>;
  children?: never;
};
type ManagedChildren<T> = SharedProps & {
  data: T[];
  managedFilters?: ManagedFilterConfig<T>[];
  isEmpty?: never;
  filters?: never;
  view?: never;
  /** Receives the filtered dataset; can render any custom layout. */
  children: (filteredData: T[]) => ReactNode;
};

export type DatabaseLayoutProps<T = unknown> =
  | CallerManagedView<T>
  | CallerManagedChildren
  | ManagedView<T>
  | ManagedChildren<T>;

// ─── Filter renderer ───────────────────────────────────────────────────────────

function FilterSlot({ config, id }: { config: FilterConfig; id: string }) {
  const { t, locale } = useLocale();

  switch (config.type) {
    case "date":
      return (
        <Filter control="date" htmlFor={id} label={t.shared.labels.date}>
          <ScheduleDatePicker
            value={config.value}
            onChange={config.onChange}
            matches={config.matches}
          />
        </Filter>
      );
    case "year":
      return (
        <YearFilter
          id={id}
          value={config.value}
          years={config.years}
          onChange={config.onChange}
          allLabel={config.allLabel}
        />
      );
    case "category":
      return (
        <CategoryFilter
          id={id}
          value={config.value}
          options={config.options.map((o) => ({
            id: o.id,
            label: locale === "ko" ? o.labelKo || o.label : o.label,
          }))}
          onChange={config.onChange}
          allLabel={config.allLabel}
        />
      );
    case "group":
      return (
        <GroupFilter
          id={id}
          value={config.value}
          options={config.options}
          onChange={config.onChange}
          allLabel={config.allLabel}
        />
      );
    case "round":
      return (
        <div className={cn(config.desktopOnly && "hidden md:contents")}>
          <RoundFilter
            id={id}
            value={config.value}
            options={config.options}
            onChange={config.onChange}
            allLabel={config.allLabel}
          />
        </div>
      );
    case "search":
      return (
        <div className={cn("min-w-0 max-w-xs flex-1", config.className)}>
          <SearchBox
            id={id}
            value={config.value}
            onChange={(e) => config.onChange(e.target.value)}
            className="w-full"
          />
        </div>
      );
    case "club":
      return (
        <ClubFilter
          id={id}
          selected={config.selected}
          options={config.options}
          onChange={config.onChange}
          placeholder={config.placeholder}
        />
      );
    case "status":
      return (
        <StatusFilter
          id={id}
          label={t.shared.labels.status}
          value={config.value}
          options={config.options}
          onChange={config.onChange}
          allLabel={config.allLabel}
        />
      );
  }
}

// ─── Managed state computation ─────────────────────────────────────────────────

type SetParam = (key: string, value: string, opts?: { clear?: string[] }) => void;

type ManagedState = {
  filteredItems: unknown[];
  displayConfigs: FilterConfig[];
  resolvedValues: Record<string, string>;
};

function computeManaged<T>(
  data: T[],
  managedFilters: ManagedFilterConfig<T>[],
  urlValues: Record<string, string>,
  set: SetParam,
): ManagedState {
  let items = data;
  const displayConfigs: FilterConfig[] = [];
  const resolvedValues: Record<string, string> = {};

  for (const f of managedFilters) {
    const raw = urlValues[f.param] ?? "";

    if (f.type === "date") {
      const value = raw || f.defaultValue?.(data) || "";
      resolvedValues[f.param] = value;
      displayConfigs.push({
        type: "date",
        value,
        onChange: (v) => set(f.param, v),
        matches: f.matches,
      });
      if (value) items = f.apply(items, value);

    } else if (f.type === "year") {
      let value = raw;
      if (!value && !f.defaultToAll && f.years.length > 0) {
        value = String([...f.years].sort((a, b) => b - a)[0]);
      }
      resolvedValues[f.param] = value;
      displayConfigs.push({
        type: "year",
        value,
        years: f.years,
        onChange: (v, opts) =>
          set(f.param, v, {
            clear: [...(opts?.clear ?? []), ...(f.clearParams ?? [])],
          }),
        allLabel: f.allLabel,
      });
      items = f.apply(items, value);

    } else if (f.type === "category") {
      const opts =
        typeof f.options === "function" ? f.options(items) : f.options;
      let value = raw;
      if (f.autoSelect && !opts.some((o) => o.id === value)) {
        value = opts[0]?.id ?? "";
      }
      resolvedValues[f.param] = value;
      displayConfigs.push({
        type: "category",
        value,
        options: opts,
        onChange: (v) => set(f.param, v, { clear: f.clearParams }),
        allLabel: f.allLabel,
      });
      if (value) items = f.apply(items, value);

    } else if (f.type === "round") {
      const roundOpts = typeof f.options === "function" ? f.options(items) : f.options;
      resolvedValues[f.param] = raw;
      displayConfigs.push({
        type: "round",
        value: raw,
        options: roundOpts,
        onChange: (v) => set(f.param, v, { clear: f.clearParams }),
        allLabel: f.allLabel,
        desktopOnly: f.desktopOnly,
      });
      if (raw) items = f.apply(items, raw);

    } else if (f.type === "search") {
      resolvedValues[f.param] = raw;
      displayConfigs.push({
        type: "search",
        value: raw,
        onChange: (v) => set(f.param, v),
        className: f.className,
      });
      if (raw) items = f.apply(items, raw);

    } else if (f.type === "group") {
      const groupOpts = typeof f.options === "function" ? f.options(items) : f.options;
      resolvedValues[f.param] = raw;
      const groupVisible = !f.visibleWhen || f.visibleWhen(resolvedValues);
      if (groupVisible && groupOpts.length > 0) {
        displayConfigs.push({
          type: "group",
          value: raw,
          options: groupOpts,
          onChange: (v) => set(f.param, v),
          allLabel: f.allLabel,
        });
      }
      items = f.apply(items, raw);

    } else if (f.type === "status") {
      const statusOpts = typeof f.options === "function" ? f.options(items) : f.options;
      resolvedValues[f.param] = raw;
      displayConfigs.push({
        type: "status",
        value: raw,
        options: statusOpts,
        onChange: (v) => set(f.param, v),
        allLabel: f.allLabel,
      });
      if (raw) items = f.apply(items, raw);

    } else if (f.type === "club") {
      const selected = raw ? raw.split(",").filter(Boolean) : [];
      resolvedValues[f.param] = raw;
      displayConfigs.push({
        type: "club",
        selected,
        options: f.options,
        onChange: (values) => set(f.param, values.join(",")),
        placeholder: f.placeholder,
      });
      items = f.apply(items, selected);
    }
  }

  return { filteredItems: items, displayConfigs, resolvedValues };
}

// ─── DatabaseLayout ────────────────────────────────────────────────────────────

export function DatabaseLayout<T = unknown>(props: DatabaseLayoutProps<T>) {
  const { t } = useLocale();
  const isManaged = "data" in props;

  const managedFilters = isManaged
    ? ((props as ManagedView<T> | ManagedChildren<T>).managedFilters ?? [])
    : ([] as ManagedFilterConfig<T>[]);

  const [urlValues, setUrlValue] = useUrlParams(managedFilters.map((f) => f.param));

  // Compute filtered items + display configs for managed mode.
  // Computed fresh each render — managedFilters are stable in practice.
  const managed = isManaged
    ? computeManaged(
        (props as ManagedView<T> | ManagedChildren<T>).data,
        managedFilters,
        urlValues,
        setUrlValue,
      )
    : null;

  // Sync auto-corrected values (e.g. category autoSelect) back to the URL.
  const resolvedStr = managed ? JSON.stringify(managed.resolvedValues) : null;
  const urlStr = managed ? JSON.stringify(urlValues) : null;
  useEffect(() => {
    if (!managed) return;
    const resolved = JSON.parse(resolvedStr!) as Record<string, string>;
    const url = JSON.parse(urlStr!) as Record<string, string>;
    for (const [key, val] of Object.entries(resolved)) {
      if (key in url && url[key] !== val) setUrlValue(key, val);
    }
  }, [resolvedStr, urlStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const { emptyText, className, contentClassName, loading, rowCountLabel } = props;

  const activeFilters = managed
    ? managed.displayConfigs
    : ((props as CallerManagedView<T> | CallerManagedChildren).filters ?? []);
  const hasFilters = activeFilters.length > 0;

  const content = (() => {
    if (managed) {
      const filteredItems = managed.filteredItems as T[];
      const p = props as ManagedView<T> | ManagedChildren<T>;
      if (filteredItems.length === 0) return loading ? null : <EmptyState text={emptyText ?? ""} />;
      if ("view" in p && p.view) {
        const v = p.view;
        if ("type" in v && v.type === "table") {
          return <TableView<T> items={filteredItems} {...v} />;
        }
        const cv = v as ManagedCardViewConfig<T>;
        return (
          <CardView<T>
            items={filteredItems}
            getKey={cv.getKey}
            renderItem={cv.renderItem}
            groupBy={cv.groupBy}
            renderGroupHeader={cv.renderGroupHeader}
            gridClass={cv.gridClass}
            gap={cv.gap}
            groupGap={cv.groupGap}
            headerGap={cv.headerGap}
            className={cv.className}
          />
        );
      }
      if ("children" in p && typeof p.children === "function") {
        return p.children(filteredItems);
      }
      return null;
    }

    // Caller-managed mode (DrawsHub, MediaHub).
    const p = props as CallerManagedView<T> | CallerManagedChildren;
    if (p.isEmpty) return <EmptyState text={emptyText ?? ""} />;
    if ("view" in p && p.view) {
      const v = p.view;
      return (
        <CardView<T>
          items={v.items}
          getKey={v.getKey}
          renderItem={v.renderItem}
          groupBy={v.groupBy}
          renderGroupHeader={v.renderGroupHeader}
          gridClass={v.gridClass}
          gap={v.gap}
          groupGap={v.groupGap}
          headerGap={v.headerGap}
          className={v.className}
        />
      );
    }
    if ("children" in p) return p.children;
    return null;
  })();

  function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
      {text}
    </div>
  );
}


  return (
    <div className={className}>
      {hasFilters && (
        <div className="flex flex-wrap items-end gap-[var(--content-gap)]">
          {activeFilters.map((config, i) => (
            <FilterSlot key={i} config={config} id={`db-filter-${i}`} />
          ))}
        </div>
      )}
      <div
        className={cn(
          hasFilters && "mt-[var(--content-gap)]",
          contentClassName,
        )}
      >
        {content}
      </div>
      {rowCountLabel && managed && (() => {
        const count = (managed.filteredItems as unknown[]).length;
        const label = Array.isArray(rowCountLabel)
          ? (count === 1 ? rowCountLabel[0] : rowCountLabel[1])
          : rowCountLabel;
        return (
          <p className="mt-2 text-right text-xs text-[var(--color-text-tertiary)]">
            {t.shared.labels.total} {count} {label}
          </p>
        );
      })()}
    </div>
  );
}
