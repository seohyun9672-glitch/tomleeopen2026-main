import type { CategoryRecord } from "@/lib/categories";

// ─── Status chips ─────────────────────────────────────────────────────────────

export type RegistrationStatus = "Pending" | "Confirmed" | "Cancelled";

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "Pending",
  "Confirmed",
  "Cancelled",
];

type RegistrationStatusKey = "pending" | "confirmed" | "cancelled";

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatusKey, { en: string; ko: string }> = {
  pending:   { en: "Pending",    ko: "대기" },
  confirmed: { en: "Confirmed",  ko: "확정" },
  cancelled: { en: "Cancelled",  ko: "취소" },
};

function registrationStatusKey(status: string): RegistrationStatusKey {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") return "confirmed";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

export function registrationStatusLabel(status: string, locale: "en" | "ko"): string {
  return REGISTRATION_STATUS_LABELS[registrationStatusKey(status)]?.[locale] ?? status;
}

export function registrationStatusChipClass(status: string): string {
  return `registration-status-chip-${registrationStatusKey(status)}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const pricePerCategoryCad = process.env.NEXT_PUBLIC_REGISTRATION_PRICE
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
      if (data.categories.length > 0) {
        cached = data;
      }
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return { categories: [], clubCodes: [] };
    });

  return inflight;
}

