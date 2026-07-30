/**
 * Declarative admin nav structure — grouped sections for the sidebar.
 * Labels are resolved from i18n content (`a.tabs.*` / `a.navGroups.*`) by the
 * caller; this file only describes structure (which tab values belong to
 * which group, and in what order).
 */

export type AdminNavGroupKey = "operations" | "tournamentSetup" | "entries";

export type AdminNavGroup = {
  /** null groupKey renders as a standalone top-level item (no group header). */
  groupKey: AdminNavGroupKey | null;
  items: string[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  { groupKey: null, items: ["dashboard"] },
  { groupKey: "entries", items: ["registrations", "teams"] },
  { groupKey: "operations", items: ["matches", "courtBookings", "ball", "tumblers"] },
  { groupKey: "tournamentSetup", items: ["categories", "prizes"] },
  { groupKey: null, items: ["players"] },
  { groupKey: null, items: ["media"] },
  { groupKey: null, items: ["admins"] },
];
