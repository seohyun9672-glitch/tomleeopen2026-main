"use client";

import type { ComponentProps } from "react";
import type { ComboboxProps } from "@/app/components/ui/Combobox";
import { Combobox } from "@/app/components/ui/Combobox";
import { Input } from "@/app/components/ui/Input";
import { Label } from "@/app/components/ui/Label";
import { MultiSelect } from "@/app/components/ui/MultiSelect";
import { Select } from "@/app/components/ui/Select";
import { Textarea } from "@/app/components/ui/Textarea";

export const formInputMatchClass = "form-control-input form-control-button-match";

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
  | ({ variant: "multiselect" } & ComponentProps<typeof MultiSelect>);

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export { Label as FormLabel, Input as FormInput, Select as FormSelect, Textarea as FormTextarea };

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function Field<TOption = unknown>(props: FieldProps<TOption>) {
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
