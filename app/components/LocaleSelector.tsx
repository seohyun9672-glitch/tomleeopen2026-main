"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavDropdown, NavDropdownItem } from "@/app/components/topheader/NavDropdown";

type Props = {
  locale: "en" | "ko";
  onChange: (locale: "en" | "ko") => void;
  enLabel?: string;
  koLabel?: string;
  className?: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LocaleSelector({
  locale,
  onChange,
  enLabel = "EN",
  koLabel = "KO",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
    setOpen((o) => !o);
  }

  const currentLabel = locale === "en" ? enLabel : koLabel;

  const options: { value: "en" | "ko"; label: string }[] = [
    { value: "en", label: enLabel },
    { value: "ko", label: koLabel },
  ];

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[var(--color-text-on-brand)]/80 transition-colors hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        <span className="text-sm font-medium">{currentLabel}</span>
        <ChevronIcon open={open} />
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <NavDropdown
            dropdownRef={dropdownRef}
            top={pos.top}
            left={pos.left}
            minWidth={144}
          >
            {options.map((opt) => (
              <NavDropdownItem
                key={opt.value}
                isActive={locale === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="flex-1">{opt.label}</span>
                {locale === opt.value && <CheckIcon />}
              </NavDropdownItem>
            ))}
          </NavDropdown>,
          document.body,
        )}
    </div>
  );
}
