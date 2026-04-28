"use client";

import { useLocale } from "@/lib/locale-context";
import { categoriesConfirmedForYear, type CategoryYearListItem } from "@/lib/category/categories";
import { Filter, type FilterControlKind } from "./Filter";
import type { ReactNode } from "react";

// ─── Filter utilities ─────────────────────────────────────────────────────────

/** Returns categories that are Active for the given year. */
export function deriveCategoriesForYear<T extends { id: string }>(
  categories: readonly T[],
  statusesByYear: Record<number, CategoryYearListItem[]>,
  year: number
): T[] {
  return categoriesConfirmedForYear(categories, statusesByYear[year] ?? []);
}

/** Sorted descending, deduplicated year list. */
export function deriveYearOptions(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => b - a);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Extract sorted unique ISO date strings, skipping null/undefined/non-ISO values. */
export function deriveDateOptions(dates: (string | null | undefined)[]): string[] {
  return [
    ...new Set(dates.filter((d): d is string => typeof d === "string" && ISO_DATE.test(d))),
  ].sort();
}

/**
 * Filter an array to items where `getValue(item)` matches `value` (as a string).
 * Returns the original array unchanged when `value` is empty.
 */
export function filterByValue<T>(
  items: T[],
  getValue: (item: T) => string | number | null | undefined,
  value: string
): T[] {
  if (!value) return items;
  return items.filter((item) => String(getValue(item) ?? "") === value);
}

// ─── Year ─────────────────────────────────────────────────────────────────────

type YearFilterProps = {
  id: string;
  value: string;
  /** Raw year numbers — sorted descending and deduplicated automatically. */
  years: number[];
  onChange: (value: string) => void;
  /** When provided, an "all years" option is rendered at the top with this text. */
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
        {options.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Category ─────────────────────────────────────────────────────────────────

type CategoryOption = { id: string; label: string };

type CategoryFilterProps = {
  id: string;
  value: string;
  options: CategoryOption[];
  onChange: (id: string) => void;
  control?: FilterControlKind;
  /** When provided, an "all categories" option is rendered at the top with this text. */
  allLabel?: string;
};

export function CategoryFilter({ id, value, options, onChange, control = "category", allLabel }: CategoryFilterProps) {
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
        {options.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Round ────────────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string };

type RoundFilterProps = {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
  /** When provided, an "all rounds" option is rendered at the top with this text. */
  allLabel?: string;
};

export function RoundFilter({ id, value, options, onChange, control = "stretch", allLabel }: RoundFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control={control} htmlFor={id} label={t.shared.labels.round}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allRounds}</option>}
        {options.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

type SeedFilterProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
  /** When provided, an "all seeds" option is rendered at the top with this text. */
  allLabel?: string;
};

export function SeedFilter({ id, value, options, onChange, control = "stretch", allLabel }: SeedFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control={control} htmlFor={id} label={t.shared.labels.seed}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allSeeds}</option>}
        {options.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Club ─────────────────────────────────────────────────────────────────────

type ClubFilterProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** When provided, an "all clubs" option is rendered at the top with this text. */
  allLabel?: string;
};

export function ClubFilter({ id, value, options, onChange, allLabel }: ClubFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control="club" htmlFor={id} label={t.shared.labels.club}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allClubs}</option>}
        {options.map((club) => (
          <option key={club} value={club}>{club}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

type GroupFilterProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** When provided, an "all groups" option is rendered at the top with this text. */
  allLabel?: string;
};

export function GroupFilter({ id, value, options, onChange, allLabel }: GroupFilterProps) {
  const { t } = useLocale();
  return (
    <Filter control="round" htmlFor={id} label={t.shared.labels.group}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {allLabel !== undefined && <option value="">{allLabel || t.shared.labels.allGroups}</option>}
        {options.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}

// ─── Status ───────────────────────────────────────────────────────────────────

type StatusFilterProps = {
  id: string;
  label: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  control?: FilterControlKind;
};

export function StatusFilter({ id, label, value, options, onChange, control = "status" }: StatusFilterProps) {
  return (
    <Filter control={control} htmlFor={id} label={label}>
      <Filter.Select
        id={id}
        value={value}
        onChange={(e) => { onChange(e.currentTarget.value); e.currentTarget.blur(); }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Filter.Select>
    </Filter>
  );
}
