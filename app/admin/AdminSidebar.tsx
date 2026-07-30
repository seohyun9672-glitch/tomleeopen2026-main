"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/app/components/ui/Button";
import { Divider } from "@/app/components/ui/Divider";

export type AdminSidebarItem = { value: string; label: string };
export type AdminSidebarGroup = { label: string | null; items: AdminSidebarItem[] };

type AdminSidebarProps = {
  groups: AdminSidebarGroup[];
  value: string;
  onSelect: (value: string) => void;
};

const DRAWER_TRANSITION_MS = 260;

/** Sidebar-panel glyph: outline when closed, left panel filled when open — a
 * single icon family with two states, instead of an unrelated hamburger/X pair. */
function SidebarPanelIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <line x1={9} y1={4} x2={9} y2={20} />
      {open && <rect x={4.25} y={5.25} width={3.5} height={13.5} rx={1} fill="currentColor" stroke="none" />}
    </svg>
  );
}

function NavButton({ item, active, onSelect }: { item: AdminSidebarItem; active: boolean; onSelect: (value: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.value)}
      className={`block w-full rounded-lg px-[10px] py-2 text-left text-sm transition-colors ${
        active
          ? "bg-[var(--color-surface-strong)] font-semibold text-[var(--color-primary-blue-700)]"
          : "font-normal text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {item.label}
    </button>
  );
}

function NavList({ groups, value, onSelect }: Pick<AdminSidebarProps, "groups" | "value" | "onSelect">) {
  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group, i) => (
        <div key={i} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {group.label && (
              <p className="px-[10px] text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavButton key={item.value} item={item} active={value === item.value} onSelect={onSelect} />
            ))}
          </div>
          {i < groups.length - 1 && <Divider />}
        </div>
      ))}
    </nav>
  );
}

/** Grouped admin navigation: persistent left panel on desktop, slide-in drawer on mobile. */
export function AdminSidebar({ groups, value, onSelect }: AdminSidebarProps) {
  // Two-state mount/visible pattern for a CSS-transition slide-in (no animation lib installed).
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  function openDrawer() { setMounted(true); }
  function closeDrawer() {
    setVisible(false);
    setTimeout(() => setMounted(false), DRAWER_TRANSITION_MS);
  }

  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeDrawer(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  const activeLabel = groups.flatMap((g) => g.items).find((i) => i.value === value)?.label ?? "";

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-[color:var(--color-border-ui)] pb-3 md:hidden">
        <IconButton
          aria-label="Open menu"
          icon={<SidebarPanelIcon open={false} />}
          onClick={openDrawer}
          className="rounded-lg border border-[color:var(--outline-blue-soft)]"
        />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{activeLabel}</span>
      </div>

      {/* Desktop persistent sidebar */}
      <div className="hidden md:block md:w-60 md:shrink-0">
        <div className="flex flex-col gap-6 rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] p-4 pb-6">
          <NavList groups={groups} value={value} onSelect={onSelect} />
        </div>
      </div>

      {/* Mobile drawer */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[300] flex transition-opacity"
          style={{ backgroundColor: "var(--overlay-scrim)", opacity: visible ? 1 : 0, transitionDuration: `${DRAWER_TRANSITION_MS}ms` }}
          onClick={closeDrawer}
          role="presentation"
        >
          <div
            className="flex h-full w-72 max-w-[80vw] flex-col gap-6 overflow-y-auto bg-[var(--color-background)] p-4 shadow-xl transition-transform ease-out"
            style={{ transform: visible ? "translateX(0)" : "translateX(-100%)", transitionDuration: `${DRAWER_TRANSITION_MS}ms` }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-end">
              <IconButton aria-label="Close menu" icon={<SidebarPanelIcon open />} onClick={closeDrawer} />
            </div>
            <NavList groups={groups} value={value} onSelect={(v) => { onSelect(v); closeDrawer(); }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
