/**
 * Registration payment and copy. Override via env if needed.
 */
const PRICE_PER_CATEGORY_CAD = 50;

export const registrationConfig = {
  pricePerCategoryCad: typeof process !== "undefined" && process.env?.NEXT_PUBLIC_REGISTRATION_PRICE
    ? Number(process.env.NEXT_PUBLIC_REGISTRATION_PRICE)
    : PRICE_PER_CATEGORY_CAD,
  // Use canonical tournament account in UI/payment copy.
  paymentEmail: "tomleeopen@gmail.com",
  paymentDeadline:
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PAYMENT_DEADLINE) || "March 15, 2026",
};

export function formatPrice(cad: number): string {
  return `${cad} CAD`;
}

export function totalFromCategories(count: number): number {
  return count * registrationConfig.pricePerCategoryCad;
}
