import { getImportantDates } from "@/lib/importantDatesData";
import { getToday, getYear } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export type RegStatus = "not-open" | "open" | "closed";

export function getRegistrationStatus(): { status: RegStatus; openDate: string; period: string } {
  const today = getToday();
  const entry = getImportantDates(getYear()).find((e) => e.label === "Registration" && e.type === "range");
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

/** True once the "Draw publish" date for the current year has passed (seeding/draws are locked). */
export function hasDrawPublishDatePassed(): boolean {
  const today = getToday();
  const entry = getImportantDates(getYear()).find((e) => e.label === "Draw publish" && e.type === "date");
  if (!entry || entry.type !== "date") return false;
  return today >= entry.date;
}

/**
 * After registration closes, Pending categories (never reached 4 teams) become Inactive
 * and their registrations are cancelled. Uses getToday() for America/Vancouver timezone.
 * Safe to call on every request — no-op until registration is closed.
 */
export async function applyPostCloseCategoryRules(year: number): Promise<void> {
  const { status } = getRegistrationStatus();
  if (status !== "closed") return;

  const pendingCats = await prisma.categoryYearStatus.findMany({
    where: { tournamentYear: year, status: "Pending" },
  });

  await Promise.all(pendingCats.map((cat) => Promise.all([
    prisma.categoryYearStatus.update({
      where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: cat.categoryId } },
      data: { status: "Inactive" },
    }),
    prisma.tournamentRegistration.updateMany({
      where: { tournamentYear: year, categoryId: cat.categoryId, NOT: { status: "Cancelled" } },
      data: { status: "Cancelled" },
    }),
    prisma.team.deleteMany({ where: { tournamentYear: year, categoryId: cat.categoryId } }),
  ])));
}
