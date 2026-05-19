"use client";

import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";
import { useLocale } from "@/lib/locale-context";
import type { ClubInfo } from "@/lib/clubs";

type ClubsSectionProps = {
  partnerClubs: ClubInfo[];
};

export function ClubsSection({ partnerClubs }: ClubsSectionProps) {
  const { t, locale } = useLocale();
  const title = t.homePage.sectionTitles.clubs;
  const viewDetail = t.shared.aria.viewDetail;

  return (
    <Section title={title} zebra>
      <div className="grid grid-cols-2 gap-[var(--element-gap)] md:gap-[var(--content-gap)] lg:flex lg:flex-row lg:gap-[var(--content-gap)]">
        {partnerClubs.filter((club) => club.logo).map((club) => {
          const clubTitle =
            locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name;
          return (
            <Card
              key={club.slug}
              imageOnly
              className="min-w-0 w-full lg:basis-0 lg:flex-1"
              image={club.logo}
              imageAlt={clubTitle}
              href={`/clubs/${club.slug}`}
              hrefAriaLabel={viewDetail(clubTitle)}
            />
          );
        })}
      </div>
    </Section>
  );
}
