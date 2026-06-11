"use client";

import type { ComponentProps, ReactNode } from "react";
import type { ComboboxProps } from "@/app/components/ui/Combobox";
import { Combobox } from "@/app/components/ui/Combobox";
import { DatePicker } from "@/app/components/ui/DatePicker";
import type { DatePickerProps } from "@/app/components/ui/DatePicker";
import { TimePicker } from "@/app/components/ui/TimePicker";
import type { TimePickerProps } from "@/app/components/ui/TimePicker";
import { Input } from "@/app/components/ui/Input";
import { MultiSelect } from "@/app/components/ui/MultiSelect";
import { Select } from "@/app/components/ui/Select";
import { Textarea } from "@/app/components/ui/Textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldTextVariant =
  | "text"
  | "email"
  | "tel"
  | "password"
  | "number"
  | "url"
  | "search"
  | "date"
  | "time";

export type FieldProps<TOption = unknown> =
  | ({ variant: FieldTextVariant } & ComponentProps<typeof Input>)
  | ({ variant: "textarea" } & ComponentProps<typeof Textarea>)
  | ({ variant: "select" } & ComponentProps<typeof Select>)
  | ({ variant: "combobox" } & ComboboxProps<TOption>)
  | ({ variant: "multiselect" } & ComponentProps<typeof MultiSelect>)
  | ({ variant: "datepicker" } & DatePickerProps)
  | ({ variant: "timepicker" } & TimePickerProps);

type FieldWrapProps = {
  /** Renders a label above the input. */
  label?: ReactNode;
  /** Appends a required (*) marker to the label. */
  required?: boolean;
  /** Renders content below the input (e.g. an error message). */
  error?: ReactNode;
  /** className applied to the wrapper div (only used when label is provided). */
  wrapperClassName?: string;
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function Field<TOption = unknown>(props: FieldProps<TOption> & FieldWrapProps) {
  const { label, required, error, wrapperClassName, ...rest } = props as FieldWrapProps & Record<string, unknown>;
  const id = (props as { id?: string }).id;

  const input = renderInput(rest as FieldProps<TOption>);

  if (!label) return input;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="block mb-1.5 text-sm font-medium [color:var(--section-text)]">
        {label}
        {required && <span className="text-[var(--form-required-mark)]"> *</span>}
      </label>
      {input}
      {error}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal renderer (label-free)
// ---------------------------------------------------------------------------

function renderInput<TOption>(props: FieldProps<TOption>): ReactNode {
  switch (props.variant) {
    case "textarea": {
      const { variant: _v, ...rest } = props;
      return <Textarea {...rest} />;
    }
    case "select": {
      const { variant: _v, ...rest } = props;
      return <Select {...rest} />;
    }
    case "combobox": {
      const { variant: _v, ...rest } = props;
      return <Combobox {...rest} />;
    }
    case "multiselect": {
      const { variant: _v, ...rest } = props;
      return <MultiSelect {...rest} />;
    }
    case "datepicker": {
      const { variant: _v, ...rest } = props;
      return <DatePicker {...rest} />;
    }
    case "timepicker": {
      const { variant: _v, ...rest } = props;
      return <TimePicker {...rest} />;
    }
    case "text":
    case "email":
    case "tel":
    case "password":
    case "number":
    case "url":
    case "search":
    case "date":
    case "time": {
      const { variant: _v, ...rest } = props;
      return <Input {...rest} type={props.variant} />;
    }
    default: {
      const _exhaustive: never = props;
      return _exhaustive;
    }
  }
}
