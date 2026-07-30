"use client";

import { Section } from "@/app/components/Section";
import { TournamentCalendar } from "@/app/components/TournamentCalendar";
import { useLocale } from "@/lib/locale-context";

export function TournamentScheduleSection() {
  const { t } = useLocale();
  const hp = t.homePage;

  return (
    <Section title={hp.sectionTitles.tournamentSchedules} zebra={false}>
      <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-[var(--section-bg)] p-[var(--calendar-card-padding)] text-[var(--foreground-on-light)] shadow-sm">
        <TournamentCalendar />
      </div>
    </Section>
  );
}
