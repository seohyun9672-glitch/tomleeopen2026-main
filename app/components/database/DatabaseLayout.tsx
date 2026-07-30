"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn, getToday, getYear } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import {
  Filter,
  YearFilter,
  CategoryFilter,
  RoundFilter,
  SeedFilter,
  ClubFilter,
  StatusFilter,
  type FilterControlKind,
} from "./Filters";
import { SearchBox } from "@/app/components/ui/SearchBox";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { CardView } from "./CardView";
import { TableView } from "@/app/components/ui/table/Table";
import type { TableViewConfig } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";

/**
 * The same "no results" chrome DatabaseLayout falls back to automatically —
 * exported so a hub using the `children` render-prop path (which owns its
 * own filtering, e.g. status tabs layered on top of the managed filters)
 * can render a matching empty state when *its* narrowing yields zero rows,
 * instead of that case silently rendering nothing.
 */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
      {text}
    </div>
  );
}

// ─── Caller-managed filter config types ───────────────────────────────────────
// Hub passes current value + onChange; hub owns the URL param state.

export type DateFilterConfig = {
  type: "date";
  value: string;
  onChange: (v: string) => void;
  enabledDates?: Set<string>;
  /** When no date is picked yet, the calendar opens to this ISO date (e.g.
   * the most recent enabled date within a sibling "year" filter's current
   * value) instead of today. */
  defaultViewDate?: string;
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
  /** `group`/`groupKo` render a section header above consecutive options sharing that group, in place of a flat list. */
  options: { id: string; label: string; labelKo?: string | null; group?: string; groupKo?: string | null }[];
  onChange: (v: string) => void;
  allLabel?: string;
  /** Accessible label override — defaults to "Category". Pass a tier label when reusing this filter shape for a tier dropdown. */
  label?: ReactNode;
  /** Sizing override — defaults to "category" (stretches). Pass "round" to hug content width instead. */
  control?: FilterControlKind;
};

export type SeedFilterConfig = {
  type: "seed";
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
  singleSelect?: boolean;
  unitLabel?: string;
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
  | SeedFilterConfig
  | RoundFilterConfig
  | SearchFilterConfig
  | ClubFilterConfig
  | StatusFilterConfig;

// ─── Self-managed filter config types ─────────────────────────────────────────
// DatabaseLayout owns the URL param state; hub provides data + param key +
// how to apply the filter. Filters are applied sequentially in array order.

/** Canonical URL param name for each filter type. Override via the `param` field. */
export const FILTER_TYPE_PARAMS = {
  date:     "date",
  year:     "year",
  category: "cat",
  search:   "q",
  round:    "round",
  seed:     "seed",
  status:   "status",
  club:     "club",
} as const satisfies Record<string, string>;

export type FilterTypeName = keyof typeof FILTER_TYPE_PARAMS;

/** Returns the default URL param name for a filter type. */
export function filterTypeParam(type: FilterTypeName): string {
  return FILTER_TYPE_PARAMS[type];
}

export type ManagedDateFilterConfig<T> = {
  type: "date";
  /** URL search param key. Defaults to {@link filterTypeParam}("date") = "date". */
  param?: string;
  /** Dates that are selectable in the picker. When omitted, all dates are enabled. */
  enabledDates?: Set<string>;
  /** Fallback when the URL param is absent. Receives the full dataset. */
  defaultValue?: (data: T[]) => string;
  /**
   * Extracts an item's date, used only to pick which year/month the calendar
   * opens to when nothing's selected yet (see `defaultViewDate` below) — not
   * a selectability constraint like `enabledDates`. Needed whenever
   * `enabledDates` isn't provided, since otherwise there's nothing to derive
   * "most recent date for the selected year" from.
   */
  dateAccessor?: (item: T) => string | null | undefined;
  apply: (items: T[], date: string) => T[];
};

export type ManagedYearFilterConfig<T> = {
  type: "year";
  /** URL search param key. Defaults to "year". */
  param?: string;
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
  /** URL search param key. Defaults to "cat". */
  param?: string;
  /**
   * Static list or a function that derives options from items already filtered
   * by earlier filters in the array (e.g. year-filtered matches → available categories).
   */
  options:
    | { id: string; label: string; labelKo?: string | null; group?: string; groupKo?: string | null }[]
    | ((prevItems: T[]) => { id: string; label: string; labelKo?: string | null; group?: string; groupKo?: string | null }[]);
  apply: (items: T[], categoryId: string) => T[];
  /**
   * When true, if the current URL value is absent or not in the option list,
   * the first available option is selected automatically.
   */
  autoSelect?: boolean;
  allLabel?: string;
  /** Additional params to clear when this filter changes. */
  clearParams?: string[];
  /** Accessible label override — defaults to "Category". Pass a tier label when reusing this filter shape for a tier dropdown. */
  label?: ReactNode;
  /** Sizing override — defaults to "category" (stretches). Pass "round" to hug content width instead. */
  control?: FilterControlKind;
};

export type ManagedSearchFilterConfig<T> = {
  type: "search";
  /** URL search param key. Defaults to "q". */
  param?: string;
  apply: (items: T[], query: string) => T[];
  className?: string;
};

export type ManagedRoundFilterConfig<T> = {
  type: "round";
  /** URL search param key. Defaults to "round". */
  param?: string;
  /** Static list or a function derived from items already filtered by earlier filters. */
  options: { value: string; label: string }[] | ((prevItems: T[]) => { value: string; label: string }[]);
  apply: (items: T[], roundCode: string) => T[];
  allLabel?: string;
  desktopOnly?: boolean;
  /** Additional params to clear when this filter changes. */
  clearParams?: string[];
};

export type ManagedSeedFilterConfig<T> = {
  type: "seed";
  /** URL search param key. Defaults to "seed". */
  param?: string;
  /** Static list or a function derived from items already filtered by earlier filters. */
  options: string[] | ((prevItems: T[]) => string[]);
  apply: (items: T[], seed: string) => T[];
  allLabel?: string;
  /** If provided, seed filter is only shown in the filter bar when this returns true. */
  visibleWhen?: (resolvedSoFar: Record<string, string>) => boolean;
};

export type ManagedStatusFilterConfig<T> = {
  type: "status";
  /** URL search param key. Defaults to "status". */
  param?: string;
  options: { value: string; label: string }[] | ((prevItems: T[]) => { value: string; label: string }[]);
  apply: (items: T[], status: string) => T[];
  allLabel?: string;
};

export type ManagedClubFilterConfig<T> = {
  type: "club";
  /** URL search param key. Defaults to "club". */
  param?: string;
  options: string[];
  /** Receives the decoded string array (comma-separated in URL). */
  apply: (items: T[], selected: string[]) => T[];
  placeholder?: string;
  unitLabel?: string;
  singleSelect?: boolean;
};

export type ManagedFilterConfig<T> =
  | ManagedDateFilterConfig<T>
  | ManagedYearFilterConfig<T>
  | ManagedCategoryFilterConfig<T>
  | ManagedSearchFilterConfig<T>
  | ManagedRoundFilterConfig<T>
  | ManagedSeedFilterConfig<T>
  | ManagedClubFilterConfig<T>
  | ManagedStatusFilterConfig<T>;

// ─── Sort — a distinct concept from filters: it reorders rather than narrows ──

export type SortOption = { value: string; label: string };

/**
 * "Pick one of N" sort control, rendered via `Tabs` on its own row above
 * the filter bar. Deliberately not a `ManagedFilterConfig` variant —
 * sorting reorders `items`, it never removes any, and it isn't
 * user-narrowing in the way a filter is.
 */
export type ManagedSortConfig<T> = {
  /** URL search param key. Defaults to "sort". */
  param?: string;
  options: SortOption[];
  /** Falls back to `options[0].value` when the URL param is absent/invalid. */
  defaultValue?: string;
  apply: (items: T[], value: string) => T[];
};

// ─── View config types ─────────────────────────────────────────────────────────

export type CardViewConfig<T> = {
  type: "card";
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
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
  /** Always shows the search box (no collapsible search-icon toggle). */
  searchAlwaysOpen?: boolean;
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
  /** Sort control, rendered via `Tabs` on its own row above the filter bar. */
  sort?: ManagedSortConfig<T>;
  isEmpty?: never;
  filters?: never;
  /** Card layout (fields match CardViewConfig minus items) or table layout. */
  view: ManagedCardViewConfig<T> | TableViewConfig<T>;
  children?: never;
};
type ManagedChildren<T> = SharedProps & {
  data: T[];
  managedFilters?: ManagedFilterConfig<T>[];
  /** Sort control, rendered via `Tabs` on its own row above the filter bar. */
  sort?: ManagedSortConfig<T>;
  isEmpty?: never;
  filters?: never;
  view?: never;
  /** Receives the filtered (and sorted, if `sort` is set) dataset; can render any custom layout. */
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
          <DatePicker
            id={id}
            value={config.value}
            onChange={config.onChange}
            enabledDates={config.enabledDates}
            defaultViewDate={config.defaultViewDate}
            placeholder={t.schedulePage.selectDatePlaceholder}
            aria-label={t.schedulePage.chooseDateAria}
            aria-label-dialog={t.schedulePage.calendarDialogAria}
            aria-label-prev={t.schedulePage.previousMonth}
            aria-label-next={t.schedulePage.nextMonth}
            className="w-full"
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
            group: o.group != null ? (locale === "ko" ? o.groupKo || o.group : o.group) : undefined,
          }))}
          onChange={config.onChange}
          allLabel={config.allLabel}
          label={config.label}
          control={config.control}
        />
      );
    case "seed":
      return (
        <SeedFilter
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
        <div className={cn("min-w-0 w-full sm:max-w-xs sm:flex-1", config.className)}>
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
          singleSelect={config.singleSelect}
          unitLabel={config.unitLabel}
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

/** Fill in the default URL param name for any filter that omits `param`. */
function resolveFilterParams<T>(
  filters: ManagedFilterConfig<T>[],
): (ManagedFilterConfig<T> & { param: string })[] {
  return filters.map((f) => {
    const param: string = f.param ?? filterTypeParam(f.type);
    return { ...f, param } as ManagedFilterConfig<T> & { param: string };
  });
}

function computeManaged<T>(
  data: T[],
  managedFilters: (ManagedFilterConfig<T> & { param: string })[],
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
      // A sibling year filter (default param "year") resolves earlier in this
      // loop when it's listed first — point the calendar at that year until
      // an actual date is picked, instead of defaulting to today's year. Land
      // on the most recent enabled date within that year (not Jan 1), so the
      // calendar opens where the actual matches are.
      const yearRaw = resolvedValues["year"];
      let defaultViewDate: string | undefined;
      if (yearRaw) {
        // Prefer enabledDates (already the definitive selectable set); fall
        // back to scanning the year-scoped items (via dateAccessor) when no
        // enabledDates was given, so this still works for date filters that
        // don't restrict which days are pickable.
        const datesInYear = f.enabledDates
          ? [...f.enabledDates].filter((d) => d.startsWith(yearRaw)).sort()
          : f.dateAccessor
            ? items.map((it) => f.dateAccessor!(it)).filter((d): d is string => !!d && d.startsWith(yearRaw)).sort()
            : [];
        if (datesInYear.length === 0) {
          defaultViewDate = `${yearRaw}-01-01`;
        } else if (yearRaw === String(getYear())) {
          // Current year: land on whichever enabled date is closest to today
          // (could be before or after), not just the latest one — "most
          // recent" only makes sense as "latest" for a past year.
          const today = getToday();
          defaultViewDate = datesInYear.reduce((closest, d) =>
            Math.abs(Date.parse(d) - Date.parse(today)) < Math.abs(Date.parse(closest) - Date.parse(today)) ? d : closest
          );
        } else {
          defaultViewDate = datesInYear[datesInYear.length - 1];
        }
      }
      displayConfigs.push({
        type: "date",
        value,
        onChange: (v) => set(f.param, v),
        enabledDates: f.enabledDates,
        defaultViewDate,
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
        label: f.label,
        control: f.control,
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

    } else if (f.type === "seed") {
      const seedOpts = typeof f.options === "function" ? f.options(items) : f.options;
      resolvedValues[f.param] = raw;
      const seedVisible = !f.visibleWhen || f.visibleWhen(resolvedValues);
      if (seedVisible && seedOpts.length > 0) {
        displayConfigs.push({
          type: "seed",
          value: raw,
          options: seedOpts,
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
        unitLabel: f.unitLabel,
        singleSelect: f.singleSelect,
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

  const rawFilters = isManaged
    ? ((props as ManagedView<T> | ManagedChildren<T>).managedFilters ?? [])
    : ([] as ManagedFilterConfig<T>[]);

  const managedFilters = resolveFilterParams(rawFilters);

  // Sort is a distinct concept from filters (it reorders `items`, never
  // narrows them), so it isn't part of `managedFilters` — but it shares the
  // same URL-param mechanism and renders in the same filter-bar row.
  const managedSort = isManaged ? (props as ManagedView<T> | ManagedChildren<T>).sort : undefined;
  const sortParamName = managedSort?.param ?? "sort";

  const [urlValues, setUrlValue] = useUrlParams(
    managedSort ? [...managedFilters.map((f) => f.param), sortParamName] : managedFilters.map((f) => f.param),
  );

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

  const sortValue = managedSort
    ? (managedSort.options.some((o) => o.value === urlValues[sortParamName])
        ? urlValues[sortParamName]
        : (managedSort.defaultValue ?? managedSort.options[0]?.value ?? ""))
    : undefined;

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

  const { emptyText, className, contentClassName, loading, rowCountLabel, searchAlwaysOpen } = props;

  const activeFilters = managed
    ? managed.displayConfigs
    : ((props as CallerManagedView<T> | CallerManagedChildren).filters ?? []);

  const searchConfig = activeFilters.find(
    (c): c is SearchFilterConfig => c.type === "search",
  );
  const nonSearchFilters = activeFilters.filter((c) => c.type !== "search");

  const [searchOpen, setSearchOpen] = useState(() => !!searchAlwaysOpen || !!searchConfig?.value);
  useEffect(() => {
    if (searchConfig?.value) setSearchOpen(true);
  }, [searchConfig?.value]);

  const hasSortRow = !!managedSort && sortValue !== undefined;
  const hasFilterRow = nonSearchFilters.length > 0 || (!!searchConfig && !searchAlwaysOpen);
  // On mobile the search field collapses behind a toggle button (visible
  // only when `searchOpen`); on desktop it's always shown inline — there's
  // no toggle there — so the field itself always has DOM presence whenever
  // a search config exists, with `searchVisible` only controlling the
  // mobile CSS show/hide, not whether it renders at all.
  const searchVisible = !!searchConfig && (searchOpen || !!searchAlwaysOpen);
  const hasFilters = hasSortRow || hasFilterRow || !!searchConfig;

  const content = (() => {
    if (managed) {
      const filteredItems = managedSort
        ? managedSort.apply(managed.filteredItems as T[], sortValue!)
        : (managed.filteredItems as T[]);
      const p = props as ManagedView<T> | ManagedChildren<T>;
      // Only short-circuit to the generic empty state for the `view` path —
      // the `children` render-prop path is used specifically so a hub can
      // render its own chrome (e.g. status tabs) around the result set, and
      // that chrome (plus a hub-local empty message) should stay visible
      // even when the current filter combination has zero matches, instead
      // of the whole tab silently disappearing.
      if ("view" in p && p.view) {
        if (filteredItems.length === 0) return loading ? null : <EmptyState text={emptyText ?? ""} />;
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

  return (
    <div className={className}>
      {hasFilters && (
        <div className="flex flex-col gap-2">

          {hasSortRow && (
            <Tabs value={sortValue!} onValueChange={(v) => setUrlValue(sortParamName, v)}>
              <TabsList>
                {managedSort!.options.map((o) => (
                  <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {(hasFilterRow || !!searchConfig) && (
            <div className="flex flex-wrap items-start gap-2">
              {nonSearchFilters.length > 0 && (
                // Omitted entirely (not just left empty) when there's no
                // filter group — an empty `flex-1` box here would still
                // claim equal width alongside the search box below, pushing
                // it to start at the row's midpoint instead of the left edge.
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {nonSearchFilters.map((config, i) => (
                    <FilterSlot key={i} config={config} id={`db-filter-${i}`} />
                  ))}
                </div>
              )}
              {searchConfig && !searchAlwaysOpen && (
                <button
                  type="button"
                  aria-label={searchOpen ? t.shared.labels.closeSearch : t.shared.labels.search}
                  aria-expanded={searchOpen}
                  onClick={() => {
                    const next = !searchOpen;
                    setSearchOpen(next);
                    if (!next) searchConfig.onChange("");
                  }}
                  // Desktop always shows the search field inline (below), so
                  // this toggle only exists on mobile, where the field
                  // collapses behind it to save space.
                  className="sm:hidden flex h-[var(--button-height-medium)] w-[var(--button-height-medium)] shrink-0 items-center justify-center rounded-lg border border-[color:var(--input-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                >
                  {searchOpen ? <X className="size-4" aria-hidden /> : <Search className="size-4" aria-hidden />}
                </button>
              )}
              {searchConfig && (
                // Always rendered (not conditional on `searchVisible`) so
                // it always has DOM presence — a sibling of the filters
                // wrapper, not nested inside its flex-1 box, otherwise its
                // "100%" width is 100% of (row width minus the toggle
                // button's reserved space), not the full row, once it wraps
                // onto its own line. `searchVisible` only controls the
                // mobile show/hide; desktop (`sm:`) always shows it,
                // regardless of the mobile-only open/closed state.
                // `sm:flex-1` (matching the filters wrapper's own flex-1)
                // splits the row evenly between the two instead of the
                // component's own default `sm:max-w-[var(--filter-control-max-w)]`
                // capping it to a fixed width — `sm:max-w-none` cancels that cap.
                <SearchBox
                  id="db-search"
                  value={searchConfig.value}
                  onChange={(e) => searchConfig.onChange(e.target.value)}
                  className={cn(
                    "w-full sm:max-w-none sm:w-auto sm:flex-1",
                    !searchVisible && "hidden sm:block",
                    searchConfig.className,
                  )}
                />
              )}
            </div>
          )}
        </div>
      )}
      <div className={cn(hasFilters && "mt-[var(--section-gap)]", contentClassName)}>
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
