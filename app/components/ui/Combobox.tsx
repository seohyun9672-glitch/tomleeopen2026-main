"use client";

import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import {
  Popover,
  useCloseOnScroll,
  useDismissOnOutsidePointerDown,
  usePopoverPlacement,
} from "@/app/components/ui/Popover";

/** Matches Tailwind `max-h-56` (14rem) for placement math */
const COMBO_DROPDOWN_MAX_PX = 224;

const inputClass = "form-control-input";

export type ComboboxProps<TOption> = {
  id: string;
  value: string;
  onValueChange: (next: string) => void;
  loadOptions: (query: string) => Promise<TOption[]>;
  onSelect?: (option: TOption) => void;
  getOptionKey: (option: TOption) => string | number;
  getOptionLabel: (option: TOption) => string;
  /** When set, the dropdown option whose key matches this value shows a checkmark. */
  selectedKey?: string | number;
  placeholder?: string;
  minQueryLength?: number;
  debounceMs?: number;
  disabled?: boolean;
  listAriaLabel?: string;
  loadingText?: string;
  emptyText?: string;
  showInitialOptions?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
};

/**
 * Generic, reusable combobox with debounced async options.
 */
export function Combobox<TOption>({
  id,
  value,
  onValueChange,
  loadOptions,
  onSelect,
  getOptionKey,
  getOptionLabel,
  selectedKey,
  placeholder,
  minQueryLength = 1,
  debounceMs = 250,
  disabled = false,
  listAriaLabel = "Suggestions",
  loadingText = "Searching...",
  emptyText = "No matches",
  showInitialOptions = false,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onBlur,
}: ComboboxProps<TOption>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<TOption[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const loadSeqRef = useRef(0);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const q = value.trim();
    const canFetchInitial = showInitialOptions && q.length === 0;
    if (!canFetchInitial && q.length < minQueryLength) {
      setOptions([]);
      setLoading(false);
      setHighlighted(-1);
      return;
    }
    const mySeq = ++loadSeqRef.current;
    setLoading(true);
    const t = setTimeout(() => {
      loadOptions(q)
        .then((list) => {
          if (mySeq !== loadSeqRef.current) return;
          setOptions(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (mySeq !== loadSeqRef.current) return;
          setOptions([]);
        })
        .finally(() => {
          if (mySeq !== loadSeqRef.current) return;
          setLoading(false);
        });
    }, debounceMs);
    return () => {
      clearTimeout(t);
    };
  }, [value, minQueryLength, debounceMs, loadOptions, open, showInitialOptions]);

  useEffect(() => {
    setHighlighted((h) => {
      if (options.length === 0) return -1;
      if (h >= options.length) return options.length - 1;
      return h;
    });
  }, [options]);

  useDismissOnOutsidePointerDown(open, [containerRef, popoverRef], () => {
    setOpen(false);
    setHighlighted(-1);
  });
  useCloseOnScroll(open, [containerRef, popoverRef], () => {
    setOpen(false);
    setHighlighted(-1);
  });

  const q = value.trim();
  const queryOk = q.length >= minQueryLength;
  const canShowInitial = showInitialOptions && q.length === 0;
  const showPanel = open && (queryOk || canShowInitial);
  const { placement, maxHeight, anchorRect } = usePopoverPlacement(showPanel, triggerRef, COMBO_DROPDOWN_MAX_PX);

  const selectOption = (option: TOption) => {
    onSelect?.(option);
    setOpen(false);
    setOptions([]);
    setHighlighted(-1);
    // Drop focus styling after a choice (mouse uses focus: ring on the input).
    queueMicrotask(() => triggerRef.current?.blur());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!open) setOpen(true);
    }
    if (!open || (!queryOk && !canShowInitial)) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHighlighted(-1);
      return;
    }

    const n = options.length;
    if (n === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i < 0 ? 0 : Math.min(i + 1, n - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? 0 : i - 1));
      return;
    }
    if (e.key === "Enter" && highlighted >= 0 && options[highlighted]) {
      e.preventDefault();
      selectOption(options[highlighted]);
    }
  };

  return (
    <div ref={containerRef} className={`relative${disabled ? " opacity-50 pointer-events-none" : ""}`}>
      <input
        ref={triggerRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          setHighlighted(-1);
          onBlur?.(e);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClass}
      />

      {showPanel && (
        <Popover ref={popoverRef} placement={placement} maxHeightPx={maxHeight} anchorRect={anchorRect}>
          <ul id={listId} role="listbox" aria-label={listAriaLabel}>
          {loading ? (
            <li className="px-4 py-2 text-sm text-[var(--color-text-tertiary)]" role="presentation">
              {loadingText}
            </li>
          ) : options.length === 0 ? (
            <li className="px-4 py-2 text-sm text-[var(--color-text-tertiary)]" role="presentation">
              {emptyText}
            </li>
          ) : (
            options.map((option, idx) => (
              <li key={getOptionKey(option)} role="option" aria-selected={highlighted === idx}>
                <button
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm [color:var(--input-text)] ${
                    highlighted === idx ? "bg-[var(--color-surface-strong)]" : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => selectOption(option)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{getOptionLabel(option)}</span>
                    {selectedKey != null && String(getOptionKey(option)) === String(selectedKey) && (
                      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[var(--color-brand-primary)]">
                        <polyline points="2 8 6 12 14 4" />
                      </svg>
                    )}
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
