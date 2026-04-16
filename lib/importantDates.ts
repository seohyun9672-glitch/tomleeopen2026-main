import { importantDates } from "./importantDatesData";

/** Final date display string from shared important-dates data. */
export function getFinalDateDisplay(): string {
  const finalEntry = importantDates.find((entry) => entry.label === "Final");
  if (!finalEntry) return "TBD";
  return finalEntry.type === "text" ? finalEntry.value : finalEntry.valueDisplay;
}
