import { NTRP_LEVELS } from "@/lib/categories";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhoneFormat(value: string): boolean {
  if (!value || !value.trim()) return true;
  return PHONE_REGEX.test(normalizePhone(value));
}

/**
 * NANP (US/Canada): 10 digits, area code (NPA) first digit 2–9, exchange (NXX) first digit 2–9.
 */
export function isValidNanpPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  if (digits[0] === "0" || digits[0] === "1") return false;
  if (digits[3] === "0" || digits[3] === "1") return false;
  return true;
}

/** As-you-type: up to 10 digits → ###-###-#### (Canadian / North American display). */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Normalize to ###-###-####; strips non-digits then formats. Empty if fewer than 10 digits. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return "";
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);
  return `${area}-${mid}-${last}`;
}

export function isValidNtrp(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return (NTRP_LEVELS as readonly string[]).includes(value.trim());
}

export function getValidNtrpOrNull(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const v = value.trim();
  return (NTRP_LEVELS as readonly string[]).includes(v) ? v : null;
}
