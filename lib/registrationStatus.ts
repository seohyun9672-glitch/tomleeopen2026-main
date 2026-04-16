/** Stored on `TournamentRegistration.status` (matches Prisma comment). */
export type RegistrationStatus = "Pending" | "Confirmed" | "Cancelled" | "Refund Requested" | "Refunded";

const REFUND_PATTERN = /\brefund\b|환불/i;

/** Admin notes that should auto-set status to Cancelled when saved (PATCH). */
export function notesImplyRefund(notes: string | null): boolean {
  if (notes == null || notes === "") return false;
  return REFUND_PATTERN.test(notes);
}

/** Skip registration for team population when cancelled or refund is noted. */
export function isEffectivelyCancelled(status: string, notes: string | null): boolean {
  if (status === "Cancelled" || status === "Refunded") return true;
  return notesImplyRefund(notes);
}
