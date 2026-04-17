"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { formInputMatchClass } from "./ui/Field";
import { Label } from "./ui/Label";

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

/** Apply width fill only to descendant native form controls. */
const FILL_CHILD = "[&_select]:w-full [&_input]:w-full";

const SELECT_CHEVRON_STYLE: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2318181b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
};

const CONTROL_INNER: Record<FilterControlKind, string> = {
  default: "w-full min-w-0 max-w-full",
  year: "w-fit min-w-0 max-w-full",
  status: "w-fit min-w-0 max-w-full",
  club: "w-fit min-w-0 max-w-full",
  round: "w-fit min-w-0 max-w-full",
  category: "w-fit min-w-0 max-w-full",
  date: "w-full min-w-0 max-w-full md:w-fit md:max-w-full",
  stretch: "w-full min-w-0 max-w-full",
};

function hugShellClassNames(className?: string) {
  return cn("flex flex-none w-fit min-w-0 max-w-full flex-col gap-0", className);
}

function stretchShellClassNames(className?: string) {
  return cn("flex flex-1 min-w-0 max-w-full flex-col gap-0", className);
}

/** Date control: full width on small screens, hug on md+ to match trigger layout. */
function dateShellClassNames(className?: string) {
  return cn(
    "flex w-full min-w-0 max-w-full flex-1 flex-col gap-0 md:w-fit md:flex-none md:shrink-0",
    className
  );
}

function isHugControl(control: FilterControlKind) {
  return (
    control === "year" ||
    control === "status" ||
    control === "club" ||
    control === "round" ||
    control === "category"
  );
}

function getOuterClassName(control: FilterControlKind, className?: string) {
  if (isHugControl(control)) return hugShellClassNames(className);
  if (control === "date") return dateShellClassNames(className);
  if (control === "default") return cn(stretchShellClassNames(className), "h-full");
  return stretchShellClassNames(className);
}

function FilterSelect({ className, id, style, ...props }: ComponentProps<"select">) {
  const htmlFor = useFilterFieldId();

  return (
    <select
      id={id ?? htmlFor}
      className={cn(formInputMatchClass, "form-control-select", className)}
      style={{ ...SELECT_CHEVRON_STYLE, ...style }}
      {...props}
    />
  );
}
FilterSelect.displayName = "Filter.Select";

function FilterDate({ className, id, ...props }: Omit<ComponentProps<"input">, "type">) {
  const htmlFor = useFilterFieldId();

  return (
    <input
      type="date"
      id={id ?? htmlFor}
      className={cn(formInputMatchClass, className)}
      {...props}
    />
  );
}
FilterDate.displayName = "Filter.Date";

function FilterRoot({ htmlFor, label, children, className, control = "default" }: FilterProps) {
  const outerClass = getOuterClassName(control, className);
  const innerClass = cn(CONTROL_INNER[control], control !== "default" && FILL_CHILD);

  return (
    <FilterHtmlForContext.Provider value={htmlFor}>
      <div className={outerClass}>
        <Label htmlFor={htmlFor}>{label}</Label>
        <div className={innerClass}>{children}</div>
      </div>
    </FilterHtmlForContext.Provider>
  );
}
FilterRoot.displayName = "Filter";

export const Filter = Object.assign(FilterRoot, {
  Select: FilterSelect,
  Date: FilterDate,
});