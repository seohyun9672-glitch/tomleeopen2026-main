"use client";

import Link from "next/link";
import { TournamentCalendar } from "@/app/components/TournamentCalendar";
import { MatchCard } from "@/app/components/MatchCard";
import { TextLink } from "@/app/components/ui/TextLink";
import { useLocale } from "@/lib/locale-context";
import type { Match } from "@/lib/matches";

type ScheduleSectionProps = {
  todayMatches: Match[];
  hasMatchesThisYear: boolean;
};

const INNER_CARD = "flex min-h-0 flex-1 flex-col rounded-xl bg-[var(--section-bg)] p-[var(--calendar-card-padding)] text-[var(--foreground-on-light)] shadow-sm";
const PANEL_CLASS = "flex min-w-0 w-full flex-1 flex-col gap-[var(--element-gap)] rounded-2xl p-[var(--content-gap)]";

export function ScheduleSection({ todayMatches }: ScheduleSectionProps) {
  const { t } = useLocale();
  const hp = t.homePage;
  const scheduleHref = hp.hero.navLinks.find((l) => /\/schedule$/.test(l.href))?.href ?? hp.hero.navLinks[0].href;

  return (
    <div className="w-full py-[var(--layout-gap)]">
      <div className="page-shell">
        <div className="flex flex-col gap-[var(--section-gap)] md:flex-row md:items-stretch md:gap-[var(--content-gap)]">

          <div className={`${PANEL_CLASS} bg-page-with-grid`}>
            <div className="flex items-center justify-between">
              <h2 className="m-0">{hp.sectionTitles.todaysMatches}</h2>
              <TextLink href={scheduleHref}>{hp.buttons.viewAll}</TextLink>
            </div>
            <div className="flex min-h-0 flex-1 flex-col text-[var(--foreground-on-light)]">
              {todayMatches.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col justify-center">
                  <p className="py-8 text-center text-[var(--color-text-secondary)]">
                    {hp.todayMatchesEmpty.beforeLink}{" "}
                    <Link
                      href={scheduleHref}
                      className="text-[var(--color-text-primary)] underline hover:no-underline"
                    >
                      {hp.todayMatchesEmpty.scheduleLink}
                    </Link>
                    {hp.todayMatchesEmpty.afterLink}
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  {todayMatches.slice(0, 3).map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${PANEL_CLASS} bg-home-zebra-with-grid`}>
            <h2 className="m-0">{hp.sectionTitles.tournamentSchedules}</h2>
            <div className={INNER_CARD}>
              <TournamentCalendar />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
