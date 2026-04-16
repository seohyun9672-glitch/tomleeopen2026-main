/** NTRP display/storage: one decimal where numeric; preserve level "5.0+". */

const FIVE_PLUS = "5.0+";

export function formatNtrpDisplay(value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "—";
  if (/^5\.0\s*\+$/i.test(v) || v === FIVE_PLUS) return FIVE_PLUS;
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n)) return v;
  return n.toFixed(1);
}

/** Normalize before saving to Player.ntrp (string). */
export function normalizeNtrpForStorage(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^5\.0\s*\+$/i.test(v) || v === FIVE_PLUS) return FIVE_PLUS;
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n)) return v;
  return n.toFixed(1);
}

/** Parse for numeric sort; 5.0+ sorts after 5.0. */
export function ntrpSortValue(value: string | null | undefined): number {
  const v = value?.trim();
  if (!v) return -1;
  if (/^5\.0\s*\+$/i.test(v) || v === FIVE_PLUS) return 5.01;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : -1;
}
