"use client";

import React from "react";
import {
  Popover,
  useDismissOnOutsidePointerDown,
  usePopoverPlacement,
} from "@/app/components/ui/Popover";
import { Chip } from "@/app/components/ui/Chip";

const MULTISELECT_DROPDOWN_MAX_PX = 192;
const listOptionClass =
  "w-full px-4 py-2.5 text-left text-sm [color:var(--input-text)] hover:bg-[var(--color-surface-muted)]";
const optionSelectedClass = "bg-[var(--color-surface-strong)]";

export type MultiSelectOption = { id: string; label: string; chipClassName?: string };

export function MultiSelect({
  id,
  selected,
  available,
  onChange,
  renderChip = (o) => <Chip label={o.label} className={o.chipClassName} />,
  placeholder,
  noMatchesText = "No matches",
  onSearchBlur,
  searchable = true,
}: {
  id: string;
  selected: readonly MultiSelectOption[];
  available: readonly MultiSelectOption[];
  onChange: (selectedIds: string[]) => void;
  renderChip?: (option: MultiSelectOption) => React.ReactNode;
  placeholder: string;
  noMatchesText?: string;
  onSearchBlur?: () => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const listId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const selectedIds = React.useMemo(() => selected.map((o) => o.id), [selected]);
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = React.useMemo(() => {
    if (!searchable) return available;
    const q = search.toLowerCase().trim();
    return available.filter((o) => o.label.toLowerCase().includes(q));
  }, [available, search, searchable]);
  const placement = usePopoverPlacement(open, triggerRef, MULTISELECT_DROPDOWN_MAX_PX);
  useDismissOnOutsidePointerDown(open, containerRef, () => setOpen(false));
  const toggleOption = React.useCallback(
    (optionId: string) => {
      if (selectedIdSet.has(optionId)) {
        onChange(selectedIds.filter((idValue) => idValue !== optionId));
        return;
      }
      onChange([...selectedIds, optionId]);
    },
    [onChange, selectedIdSet, selectedIds]
  );

  const toggleOpen = React.useCallback(() => {
    setOpen((was) => {
      const next = !was;
      if (next && searchable) queueMicrotask(() => searchInputRef.current?.focus());
      return next;
    });
  }, [searchable]);

  return (
    <div ref={containerRef} className="relative w-full">
        <div
          ref={triggerRef}
          id={searchable ? undefined : id}
          className="form-control-input form-control-chips-trigger cursor-pointer"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          tabIndex={searchable ? -1 : 0}
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (!searchable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              toggleOpen();
            }
          }}
        >
          {selected.length === 0 ? (
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          ) : (
            selected.map((opt) => (
              <span key={opt.id} className="inline-flex items-center gap-1">
                {renderChip(opt)}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selectedIds.filter((idValue) => idValue !== opt.id));
                  }}
                  className="shrink-0 rounded p-0.5 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_10%,transparent)]"
                  aria-label={`Remove ${opt.label}`}
                >
                  <span className="sr-only">Remove</span>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          )}
          {searchable ? (
            <input
              ref={searchInputRef}
              id={id}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => onSearchBlur?.()}
              onClick={(e) => e.stopPropagation()}
              placeholder=""
              className="min-h-[1.25rem] min-w-[8rem] max-w-none flex-1 cursor-text border-0 bg-transparent [color:var(--input-text)] outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              autoComplete="off"
              role="searchbox"
              aria-controls={listId}
            />
          ) : null}
        </div>
        {open && (
          <Popover placement={placement} maxHeightClass="max-h-48">
            <ul id={listId} role="listbox" aria-multiselectable="true">
              {filtered.length === 0 ? (
                <li className="px-4 py-2 text-sm text-[var(--color-text-tertiary)]">{noMatchesText}</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.id} role="option" aria-selected={selectedIdSet.has(opt.id)}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        toggleOption(opt.id);
                        setSearch("");
                      }}
                      className={`${listOptionClass} ${selectedIdSet.has(opt.id) ? optionSelectedClass : ""}`.trim()}
                    >
                      <span className="inline-flex w-full items-center justify-between gap-2">
                        <span>{opt.label}</span>
                        {selectedIdSet.has(opt.id) ? <span aria-hidden>✓</span> : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Popover>
        )}
    </div>
  );
}
