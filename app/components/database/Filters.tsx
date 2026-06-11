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
import { Popover, usePopoverPlacement, useDismissOnOutsidePointerDown } from "@/app/components/ui/Popover";

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
const HUG_CONTROLS = new Set<FilterControlKind>(["year", "round", "status"]);

function shellClass(control: FilterControlKind, className?: string) {
  if (HUG_CONTROLS.has(control)) return cn("flex flex-none flex-col gap-0 min-w-0 w-fit", className);
  if (control === "default") return cn("flex flex-1 flex-col gap-0 min-w-0 h-full w-full", className);
  if (control === "stretch") return cn("flex flex-1 flex-col gap-0 min-w-0 w-full", className);
  // Category fills leftover row space; date and club keep a capped fixed width.
  if (control === "category") return cn("flex flex-1 flex-col gap-0 min-w-0", className);
  if (control === "date") return cn("flex flex-none flex-col gap-0 min-w-0 w-full sm:max-w-[var(--filter-control-max-w)]", className);
  return cn("flex flex-none flex-col gap-0 min-w-0 w-full max-w-[var(--filter-control-max-w)]", className);
}

function innerClass(control: FilterControlKind) {
  if (HUG_CONTROLS.has(control)) return "w-fit min-w-0";
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
        <label htmlFor={htmlFor} className="block mb-1.5 text-sm font-medium [color:var(--section-text)] whitespace-nowrap">{label}</label>
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

type CategoryOption = { id: string; label: string };

type CategoryFilterProps = {
  id: string;
  value: string;
  options: CategoryOption[];
  onChange: (id: string) => void;
  control?: FilterControlKind;
  allLabel?: string;
};

export function CategoryFilter({
  id,
  value,
  options,
  onChange,
  control = "category",
  allLabel,
}: CategoryFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control={control} htmlFor={id} label={t.shared.labels.category}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && (
          <option value="">{allLabel || t.shared.labels.allCategories}</option>
        )}
        {options.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </Filter.Select>
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
  return (
    <Filter control={control} htmlFor={id} label={t.shared.labels.seed}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allSeeds}</option>}
        {options.map((s) => <option key={s} value={s}>{s}</option>)}
      </Filter.Select>
    </Filter>
  );
}

// ─── ClubFilter ───────────────────────────────────────────────────────────────

const CLUB_DROPDOWN_MAX_PX = 208;
const CHEVRON_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2318181b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")";

type ClubFilterProps = {
  id: string;
  selected: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function ClubFilter({ id, selected, options, onChange, placeholder }: ClubFilterProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const placement = usePopoverPlacement(open, triggerRef, CLUB_DROPDOWN_MAX_PX);
  useDismissOnOutsidePointerDown(open, containerRef, () => setOpen(false));

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (club: string) =>
    onChange(selectedSet.has(club) ? selected.filter((c) => c !== club) : [...selected, club]);

  const label =
    selected.length === 0
      ? (placeholder ?? t.shared.labels.allClubs)
      : selected.length === 1
      ? selected[0]!
      : `${selected.length} ${t.shared.labels.club.toLowerCase()}`;

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
          className="form-control-input form-control-select form-control-button-match w-full text-left"
          style={{ backgroundImage: CHEVRON_BG }}
        >
          <span className={selected.length === 0 ? "text-[var(--color-text-tertiary)]" : ""}>
            {label}
          </span>
        </button>
        {open && (
          <Popover placement={placement} maxHeightClass="max-h-52">
            <ul role="listbox" aria-multiselectable="true">
              {options.map((club) => {
                const checked = selectedSet.has(club);
                return (
                  <li key={club} role="option" aria-selected={checked}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggle(club)}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--color-surface-muted)] ${checked ? "bg-[var(--color-surface-strong)]" : ""}`}
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

// ─── GroupFilter ──────────────────────────────────────────────────────────────

type GroupFilterProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel?: string;
};

export function GroupFilter({ id, value, options, onChange, allLabel }: GroupFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control="round" htmlFor={id} label={t.shared.labels.seed}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allGroups}</option>}
        {options.map((g) => <option key={g} value={g}>{g}</option>)}
      </Filter.Select>
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
