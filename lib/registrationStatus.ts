import { importantDates } from "@/lib/importantDatesData";

export type RegStatus = "not-open" | "open" | "closed";

export function getRegistrationStatus(): { status: RegStatus; openDate: string; period: string } {
  const today = new Date().toISOString().slice(0, 10);
  const entry = importantDates.find((e) => e.label === "Registration" && e.type === "range");
  if (!entry || entry.type !== "range") {
    return { status: "not-open", openDate: "", period: "" };
  }
  if (today < entry.startDate) {
    return { status: "not-open", openDate: entry.startDate, period: entry.valueDisplay };
  }
  if (today > entry.endDate) {
    return { status: "closed", openDate: entry.startDate, period: entry.valueDisplay };
  }
  return { status: "open", openDate: entry.startDate, period: entry.valueDisplay };
}
