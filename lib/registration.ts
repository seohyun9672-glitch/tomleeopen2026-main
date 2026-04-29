import type { CategoryRecord } from "@/lib/category/categories";

// ─── Status chips ─────────────────────────────────────────────────────────────

export type RegistrationStatus = "Pending" | "Confirmed" | "Cancelled" | "Refund Requested" | "Refunded";

const REGISTRATION_STATUS_LABELS: Record<string, { en: string; ko: string }> = {
  pending:   { en: "Pending",   ko: "대기" },
  confirmed: { en: "Confirmed", ko: "확정" },
  cancelled: { en: "Cancelled", ko: "취소" },
  refunded:  { en: "Refunded",  ko: "환불" },
};

export type RegistrationStatusKey = "pending" | "confirmed" | "cancelled" | "refunded";

export function registrationStatusKey(status: string): RegistrationStatusKey {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") return "confirmed";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded" || s.includes("refund")) return "refunded";
  return "pending";
}

export function registrationStatusLabel(status: string, locale: "en" | "ko"): string {
  return REGISTRATION_STATUS_LABELS[registrationStatusKey(status)]?.[locale] ?? status;
}

export function registrationStatusChipClass(status: string): string {
  return `registration-status-chip-${registrationStatusKey(status)}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const pricePerCategoryCad = process.env.NEXT_PUBLIC_REGISTRATION_PRICE
  ? Number(process.env.NEXT_PUBLIC_REGISTRATION_PRICE)
  : 50;

export function formatPrice(cad: number): string {
  return `${cad} CAD`;
}

export function totalFromCategories(count: number): number {
  return count * pricePerCategoryCad;
}

// ─── Form data cache ──────────────────────────────────────────────────────────

type FormStaticData = {
  categories: CategoryRecord[];
  clubCodes: string[];
};

let cached: FormStaticData | null = null;
let inflight: Promise<FormStaticData> | null = null;

export async function loadRegistrationFormData(): Promise<FormStaticData> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = Promise.all([
    fetch("/api/clubs").then((r) => (r.ok ? r.json() : [])),
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
  ])
    .then(([clubs, categories]) => {
      const data: FormStaticData = {
        categories: categories as CategoryRecord[],
        clubCodes: (clubs as { code: string }[]).map((c) => c.code),
      };
      cached = data;
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return { categories: [], clubCodes: [] };
    });

  return inflight;
}

export function prefetchRegistrationFormData(): void {
  void loadRegistrationFormData();
}
