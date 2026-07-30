"use client";

import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";
import { useLocale } from "@/lib/locale-context";

type Sponsor = {
  id: string | number;
  name: string;
  image: string | null;
  website?: string | null;
};

type SponsorsSectionProps = {
  sponsors: Sponsor[];
};

const GOLD_NAMES = ["tom lee sedation"];
const SILVER_NAMES = ["dentures", "pioneer law"];

function sponsorTier(name: string): "gold" | "silver" | "bronze" {
  const lower = name.toLowerCase();
  if (GOLD_NAMES.some((n) => lower.includes(n))) return "gold";
  if (SILVER_NAMES.some((n) => lower.includes(n))) return "silver";
  return "bronze";
}

function TierHeading({ label }: { label: string }) {
  return (
    <div className="py-[var(--content-gap)]">
      <h3 className="m-0 border-l-4 border-[color:var(--color-primary-blue)] pl-3 text-[var(--foreground)]">
        {label}
      </h3>
    </div>
  );
}

// One card fills the whole row, two split it in half, and so on up to a
// max of 4 per row on desktop (3 on tablet, 2 on mobile) — `grow` lets each
// flex line's items expand to fill any leftover width, so a row with fewer
// items than that max (e.g. only 2 cards total, or a trailing row) still
// stretches to fill the full width instead of leaving empty space or
// forcing a fixed column count when there aren't enough cards to fill it.
const SPONSOR_CARD_CLASS = "grow basis-1/2 md:basis-1/3 lg:basis-1/4 min-w-0";

function SponsorGrid({ items, visit }: { items: Sponsor[]; visit: (name: string) => string }) {
  return (
    <div className="flex flex-wrap gap-0">
      {items.map((item) => (
        <Card
          key={item.id}
          imageOnly
          image={item.image}
          imageAlt={item.name}
          href={item.website ?? "#"}
          hrefAriaLabel={visit(item.name)}
          className={SPONSOR_CARD_CLASS}
        />
      ))}
    </div>
  );
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  const { t } = useLocale();
  const title = t.homePage.sectionTitles.sponsors;
  const tierLabels = t.homePage.sponsorTierLabels;
  const visit = t.shared.aria.visit;

  const gold = sponsors.filter((s) => sponsorTier(s.name) === "gold");
  const silver = sponsors.filter((s) => sponsorTier(s.name) === "silver");
  const bronze = sponsors.filter((s) => sponsorTier(s.name) === "bronze");

  return (
    <Section title={title} zebra>
      {gold.length > 0 && (
        <div>
          <TierHeading label={tierLabels.gold} />
          <SponsorGrid items={gold} visit={visit} />
        </div>
      )}

      {silver.length > 0 && (
        <div>
          <TierHeading label={tierLabels.silver} />
          <SponsorGrid items={silver} visit={visit} />
        </div>
      )}

      {bronze.length > 0 && (
        <div>
          <TierHeading label={tierLabels.bronze} />
          <SponsorGrid items={bronze} visit={visit} />
        </div>
      )}
    </Section>
  );
}
