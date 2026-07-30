"use client";

import Link from "next/link";
import { Section } from "@/app/components/Section";
import { MatchCard } from "@/app/components/MatchCard";
import { TextLink } from "@/app/components/ui/TextLink";
import { useLocale } from "@/lib/locale-context";
import type { Match } from "@/lib/matches";

export function TodaysMatchesSection({ todayMatches }: { todayMatches: Match[] }) {
  const { t } = useLocale();
  const hp = t.homePage;
  const scheduleHref = hp.hero.navLinks.find((l) => /\/schedule$/.test(l.href))?.href ?? hp.hero.navLinks[0].href;

  return (
    <Section
      zebra
      title={
        <div className="flex w-full items-center justify-between">
          <span>{hp.sectionTitles.todaysMatches}</span>
          <TextLink href={scheduleHref}>{hp.buttons.viewAll}</TextLink>
        </div>
      }
    >
      {todayMatches.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          {todayMatches.slice(0, 3).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </Section>
  );
}
