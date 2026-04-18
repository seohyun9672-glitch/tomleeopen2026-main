import Link from "next/link";
import { TournamentCalendar } from "@/app/components/TournamentCalendar";

type TodayMatch = {
  id: string;
  category: string;
  team1: string;
  team2: string;
  court?: string;
  time?: string;
};

type ScheduleSectionProps = {
  hp: {
    sectionTitles: { tournamentSchedules: string; todaysMatches: string };
    todayMatchesEmpty: { beforeLink: string; scheduleLink: string; afterLink: string };
    matchListVersus: string;
    matchListCourtPrefix: string;
  };
  todayMatches: TodayMatch[];
};

const INNER_CARD = "flex min-h-0 flex-1 flex-col rounded-xl bg-[var(--section-bg)] p-[var(--calendar-card-padding)] text-[var(--foreground-on-light)] shadow-sm";

export function ScheduleSection({ hp, todayMatches }: ScheduleSectionProps) {
  return (
    <div className="py-[var(--layout-gap)]">
      <div className="page-shell">
        <div className="flex flex-col gap-[var(--section-gap)] md:flex-row md:items-stretch md:gap-[var(--content-gap)]">

          <div className="flex min-w-0 flex-1 flex-col gap-[var(--content-gap)] md:gap-[var(--section-gap)]">
            <h2>{hp.sectionTitles.tournamentSchedules}</h2>
            <div className={INNER_CARD}>
              <TournamentCalendar />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[var(--content-gap)] md:gap-[var(--section-gap)]">
            <h2>{hp.sectionTitles.todaysMatches}</h2>
            <div className={INNER_CARD}>
              {todayMatches.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col justify-center">
                  <p className="py-8 text-center text-[var(--color-text-secondary)]">
                    {hp.todayMatchesEmpty.beforeLink}{" "}
                    <Link
                      href={"/schedule"}
                      className="text-[var(--color-text-primary)] underline hover:no-underline"
                    >
                      {hp.todayMatchesEmpty.scheduleLink}
                    </Link>
                    {hp.todayMatchesEmpty.afterLink}
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <ul className="shrink-0 divide-y divide-[color:var(--color-border-ui)]">
                    {todayMatches.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-[var(--element-gap)] py-[var(--content-gap)] first:pt-0 last:pb-0"
                      >
                        <span className="text-sm text-[var(--color-text-secondary)]">{m.category}</span>
                        <span className="text-[var(--color-text-primary)]">
                          {m.team1} {hp.matchListVersus} {m.team2}
                        </span>
                        {m.court && (
                          <span className="text-[var(--color-text-secondary)]">
                            {hp.matchListCourtPrefix} {m.court}
                          </span>
                        )}
                        {m.time && (
                          <span className="text-[var(--color-text-secondary)]">{m.time}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="min-h-0 flex-1" aria-hidden />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
