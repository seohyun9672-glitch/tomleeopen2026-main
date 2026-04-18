import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";
import type { Locale } from "@/lib/content";
import type { PartnerClub } from "@/lib/partnerClubsData";

type ClubsSectionProps = {
  title: string;
  partnerClubs: PartnerClub[];
  locale: Locale;
  content: { shared: { aria: { viewDetail: (name: string) => string } } };
};

export function ClubsSection({ title, partnerClubs, locale, content }: ClubsSectionProps) {
  return (
    <Section title={title} zebra>
      <div className="grid grid-cols-2 gap-[var(--element-gap)] md:gap-[var(--content-gap)] lg:flex lg:flex-row lg:gap-[var(--content-gap)]">
        {partnerClubs.map((club) => {
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
              hrefAriaLabel={content.shared.aria.viewDetail(clubTitle)}
            />
          );
        })}
      </div>
    </Section>
  );
}
