"use client";

import React from "react";
import {
  Popover,
  useCloseOnScroll,
  useDismissOnOutsidePointerDown,
  usePopoverPlacement,
} from "@/app/components/ui/Popover";
import { Chip } from "@/app/components/ui/Chip";

const MULTISELECT_DROPDOWN_MAX_PX = 192;
const listOptionClass =
  "w-full px-4 py-2.5 text-left text-sm [color:var(--input-text)] hover:bg-[var(--color-surface-muted)]";
const optionSelectedClass = "bg-[var(--color-surface-strong)]";
const optionFocusedClass = "ring-2 ring-inset ring-[var(--color-primary)]";

export type MultiSelectOption = { id: string; label: string; chipClassName?: string; group?: string };

type GroupedItem =
  | { type: "divider" }
  | { type: "header"; label: string }
  | { type: "option"; option: MultiSelectOption; filteredIndex: number };

function buildGroupedItems(options: readonly MultiSelectOption[]): GroupedItem[] {
  const items: GroupedItem[] = [];
  let lastGroup: string | undefined = undefined;
  let firstGroup = true;
  options.forEach((opt, idx) => {
    if (opt.group !== undefined && opt.group !== lastGroup) {
      if (!firstGroup) items.push({ type: "divider" });
      items.push({ type: "header", label: opt.group });
      lastGroup = opt.group;
      firstGroup = false;
    }
    items.push({ type: "option", option: opt, filteredIndex: idx });
  });
  return items;
}

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
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const listId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const selectedIds = React.useMemo(() => selected.map((o) => o.id), [selected]);
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = React.useMemo(() => {
    if (!searchable) return available;
    const q = search.toLowerCase().trim();
    return available.filter((o) => o.label.toLowerCase().includes(q));
  }, [available, search, searchable]);
  const groupedItems = React.useMemo(() => buildGroupedItems(filtered), [filtered]);
  const { placement, maxHeight, anchorRect } = usePopoverPlacement(open, triggerRef, MULTISELECT_DROPDOWN_MAX_PX);
  useDismissOnOutsidePointerDown(open, [containerRef, popoverRef], () => setOpen(false));
  useCloseOnScroll(open, [containerRef, popoverRef], () => setOpen(false));

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

  // When the dropdown opens in non-searchable mode, focus the hidden input so
  // it can capture keyboard events including IME composition.
  React.useEffect(() => {
    if (open && !searchable) {
      queueMicrotask(() => hiddenInputRef.current?.focus());
    }
  }, [open, searchable]);

  React.useEffect(() => {
    if (!open) setFocusedIndex(-1);
  }, [open]);

  React.useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('[role="option"]');
    items[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  // Navigation keys on the trigger div (only used when dropdown is closed).
  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (searchable || open) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  }

  // Arrow / Enter / Escape keys on the hidden input (dropdown open, non-searchable).
  function handleHiddenInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filtered.length) {
        toggleOption(filtered[focusedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

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
          onKeyDown={handleTriggerKeyDown}
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
              className="min-h-[1.25rem] min-w-0 max-w-none flex-1 cursor-text border-0 bg-transparent [color:var(--input-text)] [font-family:inherit]"
              autoComplete="off"
              role="searchbox"
              aria-controls={listId}
            />
          ) : null}
        </div>

        {!searchable && (
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="none"
            readOnly
            aria-hidden="true"
            tabIndex={-1}
            onKeyDown={handleHiddenInputKeyDown}
            className="sr-only"
          />
        )}

        {open && (
          <Popover ref={popoverRef} placement={placement} maxHeightPx={maxHeight} anchorRect={anchorRect}>
            <ul ref={listRef} id={listId} role="listbox" aria-multiselectable="true">
              {filtered.length === 0 ? (
                <li className="px-4 py-2 text-sm text-[var(--color-text-tertiary)]">{noMatchesText}</li>
              ) : (
                groupedItems.map((item, i) =>
                  item.type === "divider" ? (
                    <li key={`divider-${i}`} role="presentation" aria-hidden="true"
                      className="mx-4 my-1 border-t border-[var(--color-border-ui)]" />
                  ) : item.type === "header" ? (
                    <li key={`header-${item.label}-${i}`} role="presentation" aria-hidden="true"
                      className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] first:pt-2">
                      {item.label}
                    </li>
                  ) : (
                    <li key={item.option.id} role="option" aria-selected={selectedIdSet.has(item.option.id)}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          toggleOption(item.option.id);
                          setSearch("");
                        }}
                        className={[
                          listOptionClass,
                          item.option.group != null ? "pl-6" : "",
                          selectedIdSet.has(item.option.id) ? optionSelectedClass : "",
                          !searchable && focusedIndex === item.filteredIndex ? optionFocusedClass : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <span className="inline-flex w-full items-center justify-between gap-2">
                          <span>{item.option.label}</span>
                          {selectedIdSet.has(item.option.id) ? <span aria-hidden>✓</span> : null}
                        </span>
                      </button>
                    </li>
                  )
                )
              )}
            </ul>
          </Popover>
        )}
    </div>
  );
}
