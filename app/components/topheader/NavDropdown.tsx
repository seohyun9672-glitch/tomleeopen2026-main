"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { memo } from "react";
import Link from "next/link";

// ─── HeaderNavLink ───────────────────────────────────────────────────────────
// Desktop nav bar + mobile menu items

const navLinkBase =
  "inline-flex h-10 min-h-10 max-h-10 w-full items-center whitespace-nowrap rounded-full px-4 text-sm leading-none font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]";
const navLinkActive =
  "bg-[var(--color-surface-card)]/20 text-[var(--color-text-on-brand)]";
const navLinkInactive =
  "text-[var(--color-text-on-brand)]/90 hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)]";

export const HeaderNavLink = memo(function NavLink({
  href,
  label,
  isActive,
  onClick,
  className = "",
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={`${navLinkBase} ${isActive ? navLinkActive : navLinkInactive} ${className}`}
    >
      {label}
    </Link>
  );
});

// ─── NavDropdown ─────────────────────────────────────────────────────────────
// Shared dropdown panel — callers wrap with createPortal

export function NavDropdown({
  children,
  dropdownRef,
  top,
  left,
  minWidth = 160,
}: {
  children: React.ReactNode;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
  top: number;
  left: number;
  minWidth?: number;
}) {
  return (
    <div
      ref={dropdownRef}
      style={{ top, left, minWidth }}
      className="fixed z-[200] overflow-hidden rounded-xl border border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)] py-1 shadow-lg"
    >
      {children}
    </div>
  );
}

// ─── NavDropdownItem ─────────────────────────────────────────────────────────
// A single row inside a NavDropdown — renders as <Link> when href is given,
// otherwise as <button>.

const itemBase =
  "flex w-full items-center gap-3 whitespace-nowrap px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-card)]/10 hover:text-[var(--color-text-on-brand)]";
const itemActive = "font-medium text-[var(--color-text-on-brand)]";
const itemInactive = "font-normal text-[var(--color-text-on-brand)]/90";

export function NavDropdownItem({
  href,
  onClick,
  isActive,
  children,
}: {
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}) {
  const cls = `${itemBase} ${isActive ? itemActive : itemInactive}`;
  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cls}
      >
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
