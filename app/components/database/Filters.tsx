"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { MultiSelect, type MultiSelectOption } from "@/app/components/ui/MultiSelect";
import { Popover, usePopoverPlacement, useDismissOnOutsidePointerDown, useCloseOnScroll } from "@/app/components/ui/Popover";

// ─── Filter ───────────────────────────────────────────────────────────────────

const FilterHtmlForContext = createContext<string | undefined>(undefined);

export function useFilterFieldId(): string | undefined {
  return useContext(FilterHtmlForContext);
}

export type FilterControlKind =
  | "default"
  | "year"
  | "status"
  | "club"
  | "round"
  | "category"
  | "date"
  | "stretch";

export type FilterProps = {
  htmlFor: string;
  label: ReactNode;
  control?: FilterControlKind;
  className?: string;
  children: ReactNode;
};

const FILL_CHILD = "[&_select]:w-full [&_input]:w-full";
const HUG_CONTROLS = new Set<FilterControlKind>(["year", "round", "status", "date", "club"]);

function shellClass(control: FilterControlKind, className?: string) {
  // Hug-content controls (year, round, status, date, club) size to whatever
  // is actually showing — the selected value once one's picked, or the
  // placeholder text otherwise — with no shared minimum width forcing them
  // wider than their own content. Date and club are the exceptions: they
  // commonly sit right next to a year filter (e.g. Court Bookings, Players),
  // and matching year's typical width keeps that pairing visually even
  // instead of looking noticeably wider/narrower once a value is showing.
  if (control === "date" || control === "club") return cn("flex flex-none flex-col gap-0 w-fit min-w-[6.5rem]", className);
  if (HUG_CONTROLS.has(control)) return cn("flex flex-none flex-col gap-0 w-fit", className);
  if (control === "default") return cn("flex flex-1 flex-col gap-0 min-w-0 h-full w-full", className);
  if (control === "stretch") return cn("flex flex-1 flex-col gap-0 min-w-0 w-full", className);
  // Category fills leftover row space; other controls (year, date, round, status) hug their content.
  if (control === "category") return cn("flex flex-1 flex-col gap-0 min-w-0", className);
  return cn("flex flex-none flex-col gap-0 min-w-0 w-full max-w-[var(--filter-control-max-w)]", className);
}

function innerClass(control: FilterControlKind) {
  if (HUG_CONTROLS.has(control)) return cn("w-full min-w-0", FILL_CHILD);
  if (control === "default") return "h-full w-full min-w-0";
  return cn("w-full min-w-0", FILL_CHILD);
}

function FilterSelect({ className, id, ...props }: ComponentProps<"select">) {
  const htmlFor = useFilterFieldId();
  return (
    <Select id={id ?? htmlFor} className={cn("form-control-button-match", className)} {...props} />
  );
}
FilterSelect.displayName = "Filter.Select";

function FilterDate({ className, id, ...props }: Omit<ComponentProps<"input">, "type">) {
  const htmlFor = useFilterFieldId();
  return (
    <Input
      type="date"
      id={id ?? htmlFor}
      className={cn("form-control-button-match", className)}
      {...props}
    />
  );
}
FilterDate.displayName = "Filter.Date";

type FilterMultiSelectProps = {
  id?: string;
  selected: readonly MultiSelectOption[];
  available: readonly MultiSelectOption[];
  onChange: (ids: string[]) => void;
  placeholder: string;
};

function FilterMultiSelect({ id, selected, available, onChange, placeholder }: FilterMultiSelectProps) {
  const htmlFor = useFilterFieldId();
  return (
    <MultiSelect
      id={id ?? htmlFor ?? ""}
      selected={selected}
      available={available}
      onChange={onChange}
      placeholder={placeholder}
      searchable={false}
    />
  );
}
FilterMultiSelect.displayName = "Filter.MultiSelect";

function FilterRoot({ htmlFor, label, children, className, control = "default" }: FilterProps) {
  return (
    <FilterHtmlForContext.Provider value={htmlFor}>
      <div className={shellClass(control, className)}>
        <label htmlFor={htmlFor} className="sr-only">{label}</label>
        <div className={innerClass(control)}>{children}</div>
      </div>
    </FilterHtmlForContext.Provider>
  );
}
FilterRoot.displayName = "Filter";

export const Filter = Object.assign(FilterRoot, {
  Select: FilterSelect,
  Date: FilterDate,
  MultiSelect: FilterMultiSelect,
});

// ─── Filter utilities ─────────────────────────────────────────────────────────

export function deriveYearOptions(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => b - a);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function deriveDateOptions(dates: (string | null | undefined)[]): string[] {
  return [
    ...new Set(dates.filter((d): d is string => typeof d === "string" && ISO_DATE.test(d))),
  ].sort();
}

export function filterByValue<T>(
  items: T[],
  getValue: (item: T) => string | number | null | undefined,
  value: string
): T[] {
  if (!value) return items;
  return items.filter((item) => String(getValue(item) ?? "") === value);
}

export function createSearchMatcher<T>(
  getFields: (item: T) => (string | null | undefined)[]
): (items: T[], query: string) => T[] {
  return (items, rawQuery) => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      getFields(item).some((f) => (f ?? "").toLowerCase().includes(q))
    );
  };
}

// ─── YearFilter ───────────────────────────────────────────────────────────────

type YearFilterProps = {
  id: string;
  value: string;
  years: number[];
  onChange: (value: string) => void;
  allLabel?: string;
};

export function YearFilter({ id, value, years, onChange, allLabel }: YearFilterProps) {
  const { t } = useLocale();
  const options = deriveYearOptions(years).map(String);
  return (
    <Filter control="year" htmlFor={id} label={t.shared.labels.year}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((y) => <option key={y} value={y}>{y}</option>)}
      </Filter.Select>
    </Filter>
  );
}

// ─── CategoryFilter ───────────────────────────────────────────────────────────

type CategoryOption = { id: string; label: string; group?: string };

type CategoryGroupedItem =
  | { type: "divider" }
  | { type: "header"; label: string }
  | { type: "option"; option: CategoryOption };

function buildCategoryGroupedItems(options: readonly CategoryOption[]): CategoryGroupedItem[] {
  const items: CategoryGroupedItem[] = [];
  let lastGroup: string | undefined;
  let first = true;
  for (const opt of options) {
    if (opt.group !== undefined && opt.group !== lastGroup) {
      if (!first) items.push({ type: "divider" });
      items.push({ type: "header", label: opt.group });
      lastGroup = opt.group;
    }
    first = false;
    items.push({ type: "option", option: opt });
  }
  return items;
}

type CategoryFilterProps = {
  id: string;
  value: string;
  options: CategoryOption[];
  onChange: (id: string) => void;
  control?: FilterControlKind;
  allLabel?: string;
  /** Accessible label override — defaults to "Category". Pass `t.shared.labels.tier` when reusing this component for a tier filter. */
  label?: ReactNode;
};

const CATEGORY_DROPDOWN_MAX_PX = 300;

// Category ids end in a tier suffix (e.g. "MD-B", "WS-G") — see
// `CATEGORY_COLOR_FG` in lib/categories.ts for the same -b/-s/-g/-o scheme.
const CATEGORY_TIER_ICON_SRC: Record<string, string> = {
  b: "/tier/bronze.svg",
  s: "/tier/silver.svg",
  g: "/tier/gold.svg",
};

function CategoryTierIcon({ categoryId }: { categoryId: string | undefined }) {
  if (!categoryId) return null;
  const dash = categoryId.lastIndexOf("-");
  // Require an actual "XX-Y" id shape — CategoryFilter is also reused for
  // non-category options (e.g. SeedFilter's raw "A"/"B"/"C" seed letters),
  // which would otherwise false-match a bare "B" as the bronze tier.
  if (dash < 0) return null;
  const tier = categoryId.slice(dash + 1).toLowerCase();
  const src = CATEGORY_TIER_ICON_SRC[tier];
  if (!src) return null;
  // Sized/aligned to match an inline emoji glyph (1em square, slight baseline drop).
  return <img src={src} alt="" aria-hidden className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />;
}

export function CategoryFilter({
  id,
  value,
  options,
  onChange,
  control = "category",
  allLabel,
  label: fieldLabelOverride,
}: CategoryFilterProps) {
  const { t } = useLocale();
  const fieldLabel = fieldLabelOverride ?? t.shared.labels.category;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { placement, maxHeight, anchorRect } = usePopoverPlacement(open, triggerRef, CATEGORY_DROPDOWN_MAX_PX);
  useDismissOnOutsidePointerDown(open, [containerRef, popoverRef], () => setOpen(false));
  useCloseOnScroll(open, [containerRef, popoverRef], () => setOpen(false));

  const selected = options.find((o) => o.id === value);
  const placeholderLabel = allLabel || t.shared.labels.allCategories;
  // A value can be selected but absent from the current `options` list (e.g.
  // options are scoped to a sibling date filter, and that category has no
  // matches on the newly picked date) — still show the raw value instead of
  // silently falling back to the placeholder, so the selection doesn't read
  // as "reset" when it's actually just yielding zero results.
  const label = selected?.label ?? (value || placeholderLabel);
  // No allLabel means this filter always has a real selection (no "clear to
  // all" state, e.g. draws always show exactly one category) — skip the
  // clear (X) button in that case, but still use the same grouped popover.
  const clearable = allLabel !== undefined;

  return (
    <Filter control={control} htmlFor={id} label={fieldLabel}>
      <div ref={containerRef} className="relative w-full min-w-0">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`form-control-input form-control-button-match !w-full text-left ${value && clearable ? "!pr-10" : ""}`}
        >
          <span className={`block truncate ${value ? "" : "text-[var(--color-text-tertiary)]"}`}><CategoryTierIcon categoryId={selected?.id} />{label}</span>
        </button>
        {clearable && value && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
        {open && (
          <Popover ref={popoverRef} placement={placement} center maxHeightPx={maxHeight} anchorRect={anchorRect} className="max-w-[24rem]">
            <ul role="listbox">
              {buildCategoryGroupedItems(options).map((item, i) => {
                if (item.type === "divider") {
                  return (
                    <li key={`divider-${i}`} role="presentation" aria-hidden="true"
                      className="mx-4 my-1 border-t border-[var(--color-border-ui)]" />
                  );
                }
                if (item.type === "header") {
                  return (
                    <li key={`header-${item.label}-${i}`} role="presentation" aria-hidden="true"
                      className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] first:pt-2">
                      {item.label}
                    </li>
                  );
                }
                const c = item.option;
                const checked = c.id === value;
                return (
                  <li key={c.id} role="option" aria-selected={checked}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { onChange(c.id); setOpen(false); }}
                      className={`w-full whitespace-nowrap px-4 py-2.5 text-left text-sm hover:bg-[var(--color-surface-muted)] ${c.group != null ? "pl-6" : ""} ${checked ? "bg-[var(--color-surface-strong)]" : ""}`}
                    >
                      <span className="inline-flex w-full items-center justify-between gap-2">
                        <span><CategoryTierIcon categoryId={c.id} />{c.label}</span>
                        {checked ? <span aria-hidden>✓</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Popover>
        )}
      </div>
    </Filter>
  );
}

// ─── RoundFilter ──────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string };

type RoundFilterProps = {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
  allLabel?: string;
};

export function RoundFilter({
  id,
  value,
  options,
  onChange,
  control = "round",
  allLabel,
}: RoundFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control={control} htmlFor={id} label={t.shared.labels.round}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allRounds}</option>}
        {options.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </Filter.Select>
    </Filter>
  );
}

// ─── SeedFilter ───────────────────────────────────────────────────────────────

type SeedFilterProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
  allLabel?: string;
};

export function SeedFilter({
  id,
  value,
  options,
  onChange,
  control = "round",
  allLabel,
}: SeedFilterProps) {
  const { t } = useLocale();
  // Reuses CategoryFilter's popover+clear-button widget so seed matches the
  // same visual format as the other non-year filters (category, tier, club)
  // instead of a plain native <select>.
  return (
    <CategoryFilter
      id={id}
      value={value}
      options={options.map((s) => ({ id: s, label: s }))}
      onChange={onChange}
      control={control}
      allLabel={allLabel}
      label={t.shared.labels.seed}
    />
  );
}

// ─── ClubFilter ───────────────────────────────────────────────────────────────

const CLUB_DROPDOWN_MAX_PX = 208;

type ClubFilterProps = {
  id: string;
  selected: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  singleSelect?: boolean;
  /** Word used for the "N ___" summary when multiple values are selected
   * (e.g. "options" when this control is reused for something other than
   * clubs). Defaults to "club(s)". */
  unitLabel?: string;
};

export function ClubFilter({ id, selected, options, onChange, placeholder, singleSelect, unitLabel }: ClubFilterProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { placement, maxHeight, anchorRect } = usePopoverPlacement(open, triggerRef, CLUB_DROPDOWN_MAX_PX);
  useDismissOnOutsidePointerDown(open, [containerRef, popoverRef], () => setOpen(false));
  useCloseOnScroll(open, [containerRef, popoverRef], () => setOpen(false));

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (club: string) =>
    onChange(selectedSet.has(club) ? selected.filter((c) => c !== club) : [...selected, club]);

  const label =
    selected.length === 0
      ? (placeholder ?? t.shared.labels.allClubs)
      : selected.length === 1
      ? selected[0]!
      : `${selected.length} ${unitLabel ?? t.shared.labels.club.toLowerCase()}`;

  if (singleSelect) {
    // Reuses CategoryFilter's popover+clear-button widget instead of a plain
    // native <select> — a native select has no clear (×) affordance, so
    // resetting the filter meant reopening the dropdown to pick the blank
    // option; the popover widget gets the same visible clear button every
    // other non-year filter (category, tier, seed) already has.
    return (
      <CategoryFilter
        id={id}
        value={selected[0] ?? ""}
        options={options.map((club) => ({ id: club, label: club }))}
        onChange={(v) => onChange(v ? [v] : [])}
        control="club"
        allLabel={placeholder ?? t.shared.labels.allClubs}
        label={t.shared.labels.club}
      />
    );
  }

  return (
    <Filter control="club" htmlFor={id} label={t.shared.labels.club}>
      <div ref={containerRef} className="relative w-full min-w-0">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`form-control-input form-control-button-match !w-full text-left ${selected.length > 0 ? "!pr-10" : ""}`}
        >
          <span className={`block truncate ${selected.length === 0 ? "text-[var(--color-text-tertiary)]" : ""}`}>
            {label}
          </span>
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
        {open && (
          <Popover ref={popoverRef} placement={placement} center maxHeightPx={maxHeight} anchorRect={anchorRect} className="max-w-[24rem]">
            <ul role="listbox" aria-multiselectable="true">
              {options.map((club) => {
                const checked = selectedSet.has(club);
                return (
                  <li key={club} role="option" aria-selected={checked}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggle(club)}
                      className={`w-full whitespace-nowrap px-4 py-2.5 text-left text-sm hover:bg-[var(--color-surface-muted)] ${checked ? "bg-[var(--color-surface-strong)]" : ""}`}
                    >
                      <span className="inline-flex w-full items-center justify-between gap-2">
                        <span>{club}</span>
                        {checked ? <span aria-hidden>✓</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Popover>
        )}
      </div>
    </Filter>
  );
}

// ─── StatusFilter ─────────────────────────────────────────────────────────────

type StatusFilterProps = {
  id: string;
  label: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
  allLabel?: string;
};

export function StatusFilter({
  id,
  label,
  value,
  options,
  onChange,
  control = "status",
  allLabel,
}: StatusFilterProps) {
  return (
    <Filter control={control} htmlFor={id} label={label}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Filter.Select>
    </Filter>
  );
}
