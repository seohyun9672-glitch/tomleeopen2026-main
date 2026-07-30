"use client";

import type React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
  /** Renders the leading search icon inside the field (aligned with `form-control-leading-icon` in globals). */
  showLeadingIcon?: boolean;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * Search field using the same control surface as filter selects ({@link formInputMatchClass}) for aligned height and hover.
 */
export function SearchBox({
  id,
  value,
  onChange,
  ariaLabel = "Search",
  showLeadingIcon = true,
  className = "",
  placeholder = "Search",
  autoFocus = false,
}: Props) {
  return (
    <div className={cn("form-control-with-leading-icon w-full sm:max-w-[var(--filter-control-max-w)]", className)}>
      {showLeadingIcon ? (
        <span className="form-control-leading-icon" aria-hidden>
          <Search className="size-4 shrink-0" strokeWidth={2} />
        </span>
      ) : null}
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          "form-input-match",
          showLeadingIcon ? "form-control-input--with-leading-icon" : "",
          "min-w-0 transition-[border-color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}
