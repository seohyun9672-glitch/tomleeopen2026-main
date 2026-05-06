"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Label } from "./ui/Label";
import { MultiSelect, type MultiSelectOption } from "./ui/MultiSelect";

const FilterHtmlForContext = createContext<string | undefined>(undefined);

/** `htmlFor` from the nearest Filter root, for controls that should inherit the same id. */
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

/** Force descendant native inputs/selects to fill their wrapper width. */
const FILL_CHILD = "[&_select]:w-full [&_input]:w-full";

function shellClass(control: FilterControlKind, className?: string) {
  if (control === "date") {
    return cn(
      "flex w-full flex-1 flex-col gap-0 min-w-0 md:w-fit md:flex-none md:shrink-0",
      className
    );
  }
  if (control === "stretch" || control === "default") {
    return cn(
      "flex flex-1 flex-col gap-0 min-w-0",
      control === "default" && "h-full",
      className
    );
  }
  return cn("flex flex-none flex-col gap-0 w-fit min-w-0", className);
}

function innerClass(control: FilterControlKind) {
  return cn(
    control === "stretch" ? "w-full min-w-0" : "w-fit min-w-0",
    control !== "default" && FILL_CHILD
  );
}

function FilterSelect({ className, id, ...props }: ComponentProps<"select">) {
  const htmlFor = useFilterFieldId();
  return (
    <Select
      id={id ?? htmlFor}
      className={cn("form-control-button-match", className)}
      {...props}
    />
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
        <Label htmlFor={htmlFor}>{label}</Label>
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
