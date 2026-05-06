import type { Locale } from "@/lib/content";
import { siteContent } from "@/lib/content";
import { getCategories } from "@/lib/category/categories";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/app/components/PageContainer";
import { RegistrationPageClient } from "@/app/registration/RegisterModal";
import { importantDates } from "@/lib/importantDatesData";

type Props = { params: Promise<{ locale: string }> };

function getRegistrationState(locale: Locale): {
  state: "before" | "open" | "closed";
  startDateDisplay: string;
  periodDisplay: string;
} {
  const regEntry = importantDates.find((e) => e.label === "Registration" && e.type === "range");
  if (!regEntry || regEntry.type !== "range") {
    return { state: "open", startDateDisplay: "", periodDisplay: "" };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const startDateDisplay = locale === "ko" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay).split(" – ")[0] : regEntry.valueDisplay.split(" – ")[0];
  const periodDisplay = locale === "ko" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay) : regEntry.valueDisplay;

  if (todayStr < regEntry.startDate) {
    return { state: "before", startDateDisplay, periodDisplay };
  }
  if (todayStr > regEntry.endDate) {
    return { state: "closed", startDateDisplay, periodDisplay };
  }
  return { state: "open", startDateDisplay, periodDisplay };
}

export default async function RegistrationPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];
  const { state: registrationState, startDateDisplay, periodDisplay } = getRegistrationState(locale);

  const [categories, clubCodes] = registrationState === "open"
    ? await Promise.all([
        getCategories().catch(() => []),
        prisma.club.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }], select: { code: true } }).then((rows) => rows.map((r) => r.code)).catch(() => []),
      ])
    : [[], []];

  return (
    <PageContainer title={content.registrationPage.heroTitle} contentMaxWidth="max-w-[700px]">
      <RegistrationPageClient
        categories={categories}
        clubCodes={clubCodes}
        registrationState={registrationState}
        startDateDisplay={startDateDisplay}
        periodDisplay={periodDisplay}
      />
    </PageContainer>
  );
}
