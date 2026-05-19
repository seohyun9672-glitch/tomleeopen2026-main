import { getCategories } from "@/lib/categories";
import { importantDates } from "@/lib/importantDatesData";
import { RegistrationHub } from "@/app/registration/RegistrationHub";

export type RegStatus = "not-open" | "open" | "closed";

function getRegistrationStatus(): { status: RegStatus; openDate: string; period: string } {
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

export default async function RegistrationPage() {
  const reg = getRegistrationStatus();

  const categories = await getCategories();

  return (
    <RegistrationHub
      categories={categories}
      regStatus={reg.status}
    />
  );
}
