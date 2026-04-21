import type { CategoryRecord } from "@/lib/categories";

// ─── Status chips ─────────────────────────────────────────────────────────────

export type RegistrationStatus = "Pending" | "Confirmed" | "Cancelled" | "Refund Requested" | "Refunded";

export const REGISTRATION_STATUS_CHIPS = {
  pending: {
    label: { en: "Pending", ko: "대기" },
    chipSurfaceClass: "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
  },
  confirmed: {
    label: { en: "Confirmed", ko: "확정" },
    chipSurfaceClass: "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
  },
  cancelled: {
    label: { en: "Cancelled", ko: "취소" },
    chipSurfaceClass: "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
  },
  refunded: {
    label: { en: "Refunded", ko: "환불" },
    chipSurfaceClass: "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
  },
} as const;

export type RegistrationStatusKey = keyof typeof REGISTRATION_STATUS_CHIPS;

export function registrationStatusKey(status: string): RegistrationStatusKey {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") return "confirmed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "refunded" || s.includes("refund")) return "refunded";
  return "pending";
}

export function registrationStatusLabel(status: string, locale: "en" | "ko"): string {
  return REGISTRATION_STATUS_CHIPS[registrationStatusKey(status)].label[locale];
}

export function registrationStatusChipClass(status: string): string {
  return REGISTRATION_STATUS_CHIPS[registrationStatusKey(status)].chipSurfaceClass;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const pricePerCategoryCad = process.env.NEXT_PUBLIC_REGISTRATION_PRICE
  ? Number(process.env.NEXT_PUBLIC_REGISTRATION_PRICE)
  : 50;

// export const paymentDeadline =
//   process.env.NEXT_PUBLIC_PAYMENT_DEADLINE ?? "March 15, 2026";

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
