"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Field } from "@/app/components/ui/Field";
import { useLocale } from "@/lib/locale-context";
import { clubChipClass } from "@/lib/clubs";
import { formatPhone } from "@/lib/utils";

import type { ClubRecord } from "@/lib/clubs";

export type PlayerFormValues = {
  fullNameEn: string;
  fullNameKo: string;
  email: string;
  phone: string;
  ntrp: string;
  gender?: string;
  clubs: string[];
};

export type PlayerSearchResult = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
};

type Props = {
  values: PlayerFormValues;
  onChange: (updates: Partial<PlayerFormValues>) => void;
  /** Pre-loaded club options. If omitted, the form fetches /api/clubs itself. */
  clubOptions?: string[];
  /** Pre-loaded NTRP levels. If omitted, the form fetches /api/ntrp itself. */
  ntrpLevels?: string[];
  /** When true, shows admin-only fields (e.g. gender). */
  isAdmin?: boolean;
  idPrefix?: string;
  /** Per-field error messages. */
  errors?: Record<string, string>;
  /** Fields that show a required (*) marker on their label. */
  required?: Partial<Record<keyof PlayerFormValues, boolean>>;
  /** Called when a player is selected from the name lookup combobox, after form values are updated. */
  onPlayerSelect?: (player: PlayerSearchResult) => void;
  /** Called on blur for any field with the current raw value. */
  onFieldBlur?: (field: keyof PlayerFormValues, value: string) => void;
  /** Extra props forwarded to the phone input (e.g. inputMode, autoComplete). */
  phoneInputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

export function PlayerForm({
  values,
  onChange,
  clubOptions: clubOptionsProp,
  ntrpLevels: ntrpLevelsProp,
  isAdmin,
  idPrefix = "player",
  errors,
  required,
  onPlayerSelect,
  onFieldBlur,
  phoneInputProps,
}: Props) {
  const { t, locale } = useLocale();
  const rf = t.registrationForm;
  const f = t.shared.form;

  const [fetchedNtrpLevels, setFetchedNtrpLevels] = useState<string[]>([]);
  const [fetchedClubOptions, setFetchedClubOptions] = useState<string[]>([]);

  useEffect(() => {
    if (ntrpLevelsProp != null) return;
    fetch("/api/ntrp")
      .then((r) => (r.ok ? r.json() : []))
      .then((levels: string[]) => setFetchedNtrpLevels(levels))
      .catch(() => {});
  }, [ntrpLevelsProp]);

  useEffect(() => {
    if (clubOptionsProp != null) return;
    fetch("/api/clubs")
      .then((r) => (r.ok ? r.json() : []))
      .then((clubs: ClubRecord[]) => {
        const codes = clubs.map((c) => c.code);
        codes.sort((a, b) => {
          const aN = a.toUpperCase() === "N/A";
          const bN = b.toUpperCase() === "N/A";
          if (aN !== bN) return aN ? 1 : -1;
          return a.localeCompare(b);
        });
        setFetchedClubOptions(codes);
      })
      .catch(() => {});
  }, [clubOptionsProp]);

  const resolvedNtrpLevels = ntrpLevelsProp ?? fetchedNtrpLevels;
  const resolvedClubOptions = clubOptionsProp ?? fetchedClubOptions;
  const clubSelectedOptions = values.clubs.map((c) => ({
    id: c,
    label: c,
    chipClassName: clubChipClass(c),
  }));
  const clubAvailableOptions = resolvedClubOptions.map((c) => ({
    id: c,
    label: c,
  }));

  function fieldLabel(key: keyof PlayerFormValues, text: string): ReactNode {
    if (!required?.[key]) return text;
    return (
      <>
        {text} <span className="text-[var(--form-required-mark)]">*</span>
      </>
    );
  }

  function fieldError(key: keyof PlayerFormValues): ReactNode {
    const msg = errors?.[key];
    return msg ? <p className="form-field-error">{msg}</p> : undefined;
  }

  async function loadPlayerOptions(
    query: string,
  ): Promise<PlayerSearchResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(`/api/players?name=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  }

  function handlePlayerSelect(player: PlayerSearchResult) {
    onChange({
      fullNameEn: player.fullNameEn,
      fullNameKo: player.fullNameKo ?? "",
      email: player.email,
      phone: player.phone ?? "",
      ntrp: player.ntrp ?? "",
      clubs: player.clubs,
    });
    onPlayerSelect?.(player);
  }

  return (
    <div className="space-y-4">
      <Field<PlayerSearchResult>
        label={fieldLabel("fullNameEn", f.fullNameEn)}
        variant="combobox"
        id={`${idPrefix}-name-en`}
        value={values.fullNameEn}
        onValueChange={(v) => onChange({ fullNameEn: v })}
        loadOptions={loadPlayerOptions}
        onSelect={handlePlayerSelect}
        getOptionKey={(p) => p.id}
        getOptionLabel={(p) => p.fullNameEn}
        aria-invalid={Boolean(errors?.fullNameEn)}
        onBlur={(e) => onFieldBlur?.("fullNameEn", e.target.value)}
        error={fieldError("fullNameEn")}
      />

      <Field<PlayerSearchResult>
        label={fieldLabel("fullNameKo", f.fullNameKo)}
        variant="combobox"
        id={`${idPrefix}-name-ko`}
        value={values.fullNameKo}
        onValueChange={(v) => onChange({ fullNameKo: v })}
        loadOptions={loadPlayerOptions}
        onSelect={handlePlayerSelect}
        getOptionKey={(p) => p.id}
        getOptionLabel={(p) =>
          locale === "ko"
            ? (p.fullNameKo ?? p.fullNameEn)
            : (p.fullNameKo ?? p.fullNameEn)
        }
        error={fieldError("fullNameKo")}
      />

      <Field
        label={fieldLabel("email", f.email)}
        variant="email"
        id={`${idPrefix}-email`}
        value={values.email}
        onChange={(e) => onChange({ email: e.target.value })}
        onBlur={(e) => onFieldBlur?.("email", e.target.value)}
        aria-invalid={Boolean(errors?.email)}
        error={fieldError("email")}
      />

      <Field
        label={fieldLabel("phone", f.phone)}
        variant="tel"
        id={`${idPrefix}-phone`}
        value={values.phone}
        onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
        onBlur={(e) => onFieldBlur?.("phone", e.target.value)}
        aria-invalid={Boolean(errors?.phone)}
        error={fieldError("phone")}
        {...phoneInputProps}
      />

      <Field
        label={fieldLabel("ntrp", f.ntrp)}
        variant="select"
        id={`${idPrefix}-ntrp`}
        value={values.ntrp}
        onChange={(e) => onChange({ ntrp: e.target.value })}
        error={fieldError("ntrp")}
      >
        <option value="">{rf.options.selectLevel}</option>
        {resolvedNtrpLevels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </Field>

      <Field
        label={f.clubs}
        variant="multiselect"
        id={`${idPrefix}-clubs`}
        selected={clubSelectedOptions}
        available={clubAvailableOptions}
        onChange={(ids) => onChange({ clubs: ids })}
        placeholder={rf.fields.searchClubsPlaceholder}
        searchable={false}
        error={fieldError("clubs")}
      />

      {isAdmin && (
        <Field
          label="Gender"
          variant="select"
          id={`${idPrefix}-gender`}
          value={values.gender ?? ""}
          onChange={(e) => onChange({ gender: e.target.value })}
        >
          <option value="">Unknown</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </Field>
      )}
    </div>
  );
}
