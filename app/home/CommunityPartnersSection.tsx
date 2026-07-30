"use client";

import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";
import { useLocale } from "@/lib/locale-context";

type CommunityPartner = {
  name: string;
  image: string | null;
  href?: string;
};

type CommunityPartnersSectionProps = {
  communityPartners: CommunityPartner[];
};

// One card fills the whole row, two split it in half, and so on up to a
// max of 4 per row on desktop (3 on tablet, 2 on mobile) — `grow` lets each
// flex line's items expand to fill any leftover width, so a row with fewer
// items than that max (e.g. only 2 cards total, or a trailing row) still
// stretches to fill the full width instead of leaving empty space or
// forcing a fixed column count when there aren't enough cards to fill it.
const COMMUNITY_CARD_CLASS = "grow basis-1/2 md:basis-1/3 lg:basis-1/4 min-w-0";

export function CommunityPartnersSection({ communityPartners }: CommunityPartnersSectionProps) {
  const { t } = useLocale();
  const title = t.homePage.sectionTitles.communityPartners;
  const visit = t.shared.aria.visit;

  return (
    <Section title={title} zebra={false}>
      <div className="flex flex-wrap gap-0">
        {communityPartners.map((item, i) => (
          <Card
            key={i}
            imageOnly
            image={item.image}
            imageAlt={item.name}
            href={item.href}
            hrefAriaLabel={visit(item.name)}
            className={COMMUNITY_CARD_CLASS}
          />
        ))}
      </div>
    </Section>
  );
}
