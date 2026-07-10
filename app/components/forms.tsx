"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Field } from "@/app/components/ui/Field";
import { ChoiceCard } from "@/app/components/ui/ChoiceCard";

import { Checkbox, CheckboxField } from "@/app/components/ui/Checkbox";
import { Input } from "@/app/components/ui/Input";
import { Divider } from "./ui/Divider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SelectOption = {
  value: string;
  label: string;
  chipClassName?: string;
  disabled?: boolean;
};

/** Form state: string for most fields, string[] for multi-select fields. */
export type FormValues = Record<string, string | string[] | null | undefined>;

type BaseField = {
  key: string;
  label: string;
  required?: boolean | ((values: FormValues) => boolean);
  /** Hide this field unless the condition is met. */
  visibleWhen?: (values: FormValues) => boolean;
  /** Disable this field when the condition is met. */
  disabledWhen?: (values: FormValues) => boolean;
};

type TextFieldConfig = BaseField & {
  type: "text" | "email" | "tel" | "number";
  placeholder?: string;
  /** Applied to every keystroke before storing the value (e.g. format enforcement). */
  transform?: (v: string) => string;
};

type TextareaFieldConfig = BaseField & { type: "textarea"; rows?: number; placeholder?: string };

type SelectFieldConfig = BaseField & {
  type: "select";
  /** Static options, or a function that fetches them on mount. */
  options: SelectOption[] | (() => Promise<string[]>);
  withChips?: boolean;
  placeholder?: string;
};

type ComboboxFieldConfig = BaseField & {
  type: "combobox";
  placeholder?: string;
  loadOptions: (q: string) => Promise<unknown[]>;
  getOptionKey: (opt: unknown) => string | number;
  getOptionLabel: (opt: unknown) => string;
  /** When an option is selected, batch-update these form keys. */
  autofill?: (opt: unknown) => Partial<FormValues>;
  /** Keys to clear when the user manually types (not selects) — e.g. a linked id field. */
  clearKeysOnChange?: string[];
  /** When set, the dropdown shows a checkmark on the option whose key matches values[selectedKeyField]. */
  selectedKeyField?: string;
  /** Show options immediately on focus before any typing. */
  showInitialOptions?: boolean;
};

export type MultiselectOption = { id: string; label: string; chipClassName?: string; group?: string };

type MultiselectFieldConfig = BaseField & {
  type: "multiselect";
  /** String arrays use the value as both id and label. Object arrays use id/label separately (form stores id). */
  options: string[] | MultiselectOption[] | (() => Promise<string[]>);
  placeholder?: string;
  chipClass?: (id: string) => string;
};

type DatepickerFieldConfig = BaseField & { type: "datepicker" };
type TimepickerFieldConfig = BaseField & { type: "timepicker" };
type CheckboxFieldConfig = BaseField & { type: "checkbox" };

type DividerFieldConfig = { type: "divider"; key: string };
type SectionHeadingFieldConfig = { type: "section-heading"; key: string; heading: string };
type RowFieldConfig = { type: "row"; key: string; fields: FieldConfig[] };
export type ScoreGridFieldConfig = {
  type: "score-grid";
  key: string;
  team1Label: string;
  team2Label: string;
  sets: Array<{ label: string; key1: string; key2: string }>;
  walkover: { label: string; key1: string; key2: string };
  disabledWhen?: (values: FormValues) => boolean;
};

export type ChoiceCardsOption = {
  value: string;
  label: string;
  sublabel?: string;
  imageSrc?: string;
  disabled?: boolean;
  badge?: string;
  badgeClassName?: string;
};

type ChoiceCardsFieldConfig = BaseField & {
  type: "choicecards";
  showImage?: boolean;
  options: ChoiceCardsOption[];
  variant?: "horizontal" | "vertical";
};

export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | ComboboxFieldConfig
  | MultiselectFieldConfig
  | DatepickerFieldConfig
  | TimepickerFieldConfig
  | CheckboxFieldConfig
  | DividerFieldConfig
  | SectionHeadingFieldConfig
  | RowFieldConfig
  | ScoreGridFieldConfig
  | ChoiceCardsFieldConfig;

// ─── Internal renderers (own state for fetched options) ───────────────────────

function SelectRenderer({
  field, id, value, required, disabled, onChange, error,
}: {
  field: SelectFieldConfig;
  id: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (v: string) => void;
  error?: ReactNode;
}) {
  const [fetched, setFetched] = useState<string[]>([]);

  useEffect(() => {
    if (typeof field.options !== "function") return;
    field.options().then(setFetched).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resolved: SelectOption[] =
    typeof field.options === "function"
      ? fetched.map((o) => ({ value: o, label: o }))
      : field.options;

  const chipOptions = field.withChips
    ? resolved.map((o) => ({ value: o.value, label: o.label, chipClassName: o.chipClassName ?? "", disabled: o.disabled }))
    : undefined;

  return (
    <Field
      variant="select"
      id={id}
      label={field.label}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      chipOptions={chipOptions}
      error={error}
    >
      {!chipOptions && (
        <>
          {field.placeholder && <option value="" disabled>{field.placeholder}</option>}
          {resolved.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </>
      )}
    </Field>
  );
}

function MultiselectRenderer({
  field, id, value, required, onChange,
}: {
  field: MultiselectFieldConfig;
  id: string;
  value: string[];
  required?: boolean;
  onChange: (v: string[]) => void;
}) {
  const [fetched, setFetched] = useState<string[]>([]);

  useEffect(() => {
    if (typeof field.options !== "function") return;
    field.options().then(setFetched).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rawOptions = typeof field.options === "function" ? fetched : field.options;
  const chipClassFn = field.chipClass ?? (() => "");

  // Support object options (id !== label) — form values store ids
  const isObjectOptions = rawOptions.length > 0 && typeof rawOptions[0] === "object";
  const available = isObjectOptions
    ? (rawOptions as MultiselectOption[]).map((o) => ({ id: o.id, label: o.label, group: o.group }))
    : (rawOptions as string[]).map((o) => ({ id: o, label: o }));
  const labelById = isObjectOptions
    ? new Map((rawOptions as MultiselectOption[]).map((o) => [o.id, o.label]))
    : null;
  const chipClassByIdFromOpts = isObjectOptions
    ? new Map((rawOptions as MultiselectOption[]).map((o) => [o.id, o.chipClassName ?? ""]))
    : null;

  return (
    <Field
      variant="multiselect"
      id={id}
      label={field.label}
      required={required}
      selected={value.map((v) => ({
        id: v,
        label: labelById?.get(v) ?? v,
        chipClassName: chipClassByIdFromOpts?.get(v) ?? chipClassFn(v),
      }))}
      available={available}
      onChange={onChange}
      placeholder={field.placeholder ?? ""}
      searchable={false}
    />
  );
}

// ─── EntityForm ───────────────────────────────────────────────────────────────

type Props = {
  fields: FieldConfig[];
  values: FormValues;
  /** Supports batch updates — combobox autofill passes multiple keys at once. */
  onChange: (updates: Partial<FormValues>) => void;
  /** Single error shown at the bottom (e.g. API error). */
  error?: string | null;
  /** Per-field error messages keyed by field key. */
  errors?: Record<string, string>;
  idPrefix?: string;
  /** Rendered above the fields (e.g. a contextual info line). */
  header?: ReactNode;
  children?: ReactNode;
};

export function EntityForm({ fields, values, onChange, error, errors, idPrefix = "field", header, children }: Props) {
  function renderField(f: FieldConfig): ReactNode {
    if ("visibleWhen" in f && f.visibleWhen && !f.visibleWhen(values)) return null;

    const id = `${idPrefix}-${f.key}`;
    const raw = "key" in f ? values[f.key] : undefined;
    const str = typeof raw === "string" ? raw : "";
    const arr = Array.isArray(raw) ? raw : [];
    const required = "required" in f
      ? (typeof f.required === "function" ? f.required(values) : f.required)
      : undefined;
    const fieldError = "key" in f ? errors?.[f.key] : undefined;
    const errorNode = fieldError ? <p className="form-field-error">{fieldError}</p> : undefined;
    const isDisabled = "disabledWhen" in f && f.disabledWhen ? f.disabledWhen(values) : false;

    if (f.type === "divider") {
      return <hr key={f.key} className="border-t border-[color:var(--color-border-ui)] my-1" />;
    }

    if (f.type === "section-heading") {
      return (
        <p key={f.key} className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {f.heading}
        </p>
      );
    }

    if (f.type === "row") {
      return (
        <div key={f.key} className="grid grid-cols-2 gap-4">
          {f.fields.map(renderField)}
        </div>
      );
    }

    if (f.type === "score-grid") {
      const scoreDisabled = isDisabled || (f.disabledWhen ? f.disabledWhen(values) : false);
      return (
        <div key={f.key} className={`grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-2${scoreDisabled ? " opacity-50 pointer-events-none" : ""}`}>
          <div />
          <div className="min-w-0 flex flex-col items-center gap-0">
            {f.team1Label.split(" / ").map((name, i) => (
              <p key={i} className="w-full text-sm font-medium text-center text-[var(--color-text-secondary)] truncate">{name}</p>
            ))}
          </div>
          <div className="min-w-0 flex flex-col items-center gap-0">
            {f.team2Label.split(" / ").map((name, i) => (
              <p key={i} className="w-full text-sm font-medium text-center text-[var(--color-text-secondary)] truncate">{name}</p>
            ))}
          </div>
          {f.sets.map((set) => {
            const setError = errors?.[set.key1] ?? errors?.[set.key2];
            return (
              <Fragment key={set.key1}>
                <span className="w-14 text-sm text-[var(--color-text-secondary)] shrink-0">{set.label}</span>
                <Input
                  type="number"
                  className={setError ? "text-center border-[var(--color-status-error)]" : "text-center"}
                  value={String(values[set.key1] ?? "")}
                  onChange={(e) => onChange({ [set.key1]: e.target.value })}
                />
                <Input
                  type="number"
                  className={setError ? "text-center border-[var(--color-status-error)]" : "text-center"}
                  value={String(values[set.key2] ?? "")}
                  onChange={(e) => onChange({ [set.key2]: e.target.value })}
                />
                {setError && (
                  <p className="col-span-3 -mt-1 text-xs text-[var(--color-status-error)]">{setError}</p>
                )}
              </Fragment>
            );
          })}
          <span className="w-14 text-sm text-[var(--color-text-secondary)] shrink-0">{f.walkover.label}</span>
          <div className="flex items-center justify-center min-h-9">
            <Checkbox
              checked={values[f.walkover.key1] === "true"}
              onChange={(e) => onChange({ [f.walkover.key1]: e.target.checked ? "true" : "false" })}
            />
          </div>
          <div className="flex items-center justify-center min-h-9">
            <Checkbox
              checked={values[f.walkover.key2] === "true"}
              onChange={(e) => onChange({ [f.walkover.key2]: e.target.checked ? "true" : "false" })}
            />
          </div>
        </div>
      );
    }

    if (f.type === "select") {
      return (
        <SelectRenderer
          key={f.key}
          field={f}
          id={id}
          value={str}
          required={required}
          disabled={isDisabled}
          onChange={(v) => onChange({ [f.key]: v })}
          error={errorNode}
        />
      );
    }

    if (f.type === "combobox") {
      const selectedKey = f.selectedKeyField
        ? (values[f.selectedKeyField] != null ? String(values[f.selectedKeyField]) : undefined)
        : undefined;
      return (
        <Field<unknown>
          key={f.key}
          variant="combobox"
          id={id}
          label={f.label}
          required={required}
          disabled={isDisabled}
          placeholder={f.placeholder}
          value={str}
          onValueChange={(v) => {
            const updates: Partial<FormValues> = { [f.key]: v };
            f.clearKeysOnChange?.forEach((k) => { updates[k] = ""; });
            onChange(updates);
          }}
          loadOptions={f.loadOptions}
          onSelect={(opt) => onChange(f.autofill?.(opt) ?? { [f.key]: f.getOptionLabel(opt) })}
          getOptionKey={f.getOptionKey}
          getOptionLabel={f.getOptionLabel}
          selectedKey={selectedKey}
          showInitialOptions={f.showInitialOptions}
          aria-invalid={Boolean(fieldError)}
          error={errorNode}
        />
      );
    }

    if (f.type === "multiselect") {
      return (
        <div key={f.key} className="flex flex-col gap-1">
          <MultiselectRenderer
            field={f}
            id={id}
            value={arr}
            required={required}
            onChange={(v) => onChange({ [f.key]: v })}
          />
          {errorNode}
        </div>
      );
    }

    if (f.type === "textarea") {
      return (
        <Field
          key={f.key}
          variant="textarea"
          id={id}
          label={f.label}
          required={required}
          disabled={isDisabled}
          value={str}
          onChange={(e) => onChange({ [f.key]: (e.target as HTMLTextAreaElement).value })}
          rows={f.rows}
          placeholder={f.placeholder}
          error={errorNode}
        />
      );
    }

    if (f.type === "datepicker") {
      return (
        <Field
          key={f.key}
          variant="datepicker"
          id={id}
          label={f.label}
          required={required}
          disabled={isDisabled}
          value={str}
          onChange={(v: string) => onChange({ [f.key]: v })}
          error={errorNode}
        />
      );
    }

    if (f.type === "timepicker") {
      return (
        <Field
          key={f.key}
          variant="timepicker"
          id={id}
          label={f.label}
          required={required}
          disabled={isDisabled}
          value={str}
          onChange={(v: string) => onChange({ [f.key]: v })}
          error={errorNode}
        />
      );
    }

    if (f.type === "choicecards") {
      const isVertical = f.variant === "vertical";
      return (
        <div key={f.key} className="flex flex-col gap-1.5">
          {f.label && (
            <p className="text-sm font-medium [color:var(--section-text)]">
              {f.label}
              {required && <span className="text-[var(--form-required-mark)]"> *</span>}
            </p>
          )}
          {isVertical ? (
            <div className="grid grid-cols-2 gap-3">
              {f.options.map((opt) => (
                <ChoiceCard
                  key={opt.value}
                  variant="vertical"
                  label={opt.label}
                  sublabel={opt.sublabel}
                  showImage={f.showImage}
                  imageSrc={opt.imageSrc}
                  selected={str === opt.value}
                  disabled={opt.disabled}
                  badge={opt.badge}
                  badgeClassName={opt.badgeClassName}
                  onClick={() => onChange({ [f.key]: opt.value })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--color-border-ui)] overflow-hidden">
              {f.options.map((opt, i) => (
                <div key={opt.value} className={i > 0 ? "border-t border-[var(--color-border-ui)]" : ""}>
                  <ChoiceCard
                    label={opt.label}
                    sublabel={opt.sublabel}
                    showImage={f.showImage}
                    imageSrc={opt.imageSrc}
                    selected={str === opt.value}
                    disabled={opt.disabled}
                    badge={opt.badge}
                    badgeClassName={opt.badgeClassName}
                    onClick={() => onChange({ [f.key]: opt.value })}
                  />
                </div>
              ))}
            </div>
          )}
          {errorNode}
        </div>
      );
    }

    if (f.type === "checkbox") {
      return (
        <div key={f.key} className="flex flex-col gap-1">
          <CheckboxField
            id={id}
            checked={str === "true"}
            required={required}
            onChange={(e) => onChange({ [f.key]: e.target.checked ? "true" : "false" })}
          >
            {f.label}
          </CheckboxField>
          {errorNode}
        </div>
      );
    }

    // text | email | tel | number
    return (
      <Field
        key={f.key}
        variant={f.type}
        id={id}
        label={f.label}
        required={required}
        disabled={isDisabled}
        value={str}
        placeholder={(f as TextFieldConfig).placeholder}
        onChange={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          onChange({ [f.key]: (f as TextFieldConfig).transform ? (f as TextFieldConfig).transform!(raw) : raw });
        }}
        aria-invalid={Boolean(fieldError)}
        error={errorNode}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* {header && <div className="py-4" > <Divider /> </div>} */}
      <div className="flex flex-col gap-6">
        {fields.map(renderField)}
      </div>
      {children}
      {error && <p className="text-sm text-[var(--color-status-error)]">{error}</p>}
    </div>
  );
}
