import type { Locale } from "@/lib/content";
import { getAllMatchesForSchedule, getScheduleCalendarIndex } from "@/lib/matches";
import { siteContent } from "@/lib/content";
import { PageContainer } from "@/app/components/PageContainer";
import { ScheduleHub } from "@/app/schedule/ScheduleHub";

const thisYear = new Date().getFullYear();

/** Cache briefly — calendar + match list change rarely. */
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export default async function SchedulePage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const calendar = await getScheduleCalendarIndex();
  const { yearsWithMatches, datesByYear } = calendar;

  const scheduleYear =
    yearsWithMatches.length === 0
      ? thisYear
      : yearsWithMatches.includes(thisYear)
        ? thisYear
        : Math.max(...yearsWithMatches);

  const datesWithMatches = datesByYear[scheduleYear] ?? [];

  const lastMatchDate =
    datesWithMatches.length > 0 ? datesWithMatches[datesWithMatches.length - 1]! : null;
  const defaultDate = lastMatchDate ?? new Date().toISOString().slice(0, 10);

  const allMatches = await getAllMatchesForSchedule(scheduleYear);

  return (
    <PageContainer title={content.schedulePage.heroTitle}>
      <ScheduleHub
        allMatches={allMatches}
        datesWithMatches={datesWithMatches}
        defaultDate={defaultDate}
        scheduleYear={scheduleYear}
      />
    </PageContainer>
  );
}
