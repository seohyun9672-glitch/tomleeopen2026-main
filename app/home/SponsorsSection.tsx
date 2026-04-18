import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";

type Sponsor = {
  id: string | number;
  name: string;
  image: string | null;
  website?: string | null;
};

type SponsorsSectionProps = {
  title: string;
  sponsors: Sponsor[];
  tierLabels: { gold: string; silver: string; bronze: string };
  content: { shared: { aria: { visit: (name: string) => string } } };
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

function bronzeColSpan(index: number): string {
  return index < 2 ? "col-span-1 sm:col-span-3 lg:col-span-1" : "col-span-1 sm:col-span-2 lg:col-span-1";
}

export function SponsorsSection({ title, sponsors, tierLabels, content }: SponsorsSectionProps) {
  const gold = sponsors.filter((s) => sponsorTier(s.name) === "gold");
  const silver = sponsors.filter((s) => sponsorTier(s.name) === "silver");
  const bronze = sponsors.filter((s) => sponsorTier(s.name) === "bronze");
  const visit = content.shared.aria.visit;

  return (
    <Section title={title} zebra>
      {gold.length > 0 && (
        <div>
          <TierHeading label={tierLabels.gold} />
          <div>
            {gold.map((item) => (
              <Card
                key={item.id}
                imageOnly
                image={item.image}
                imageAlt={item.name}
                href={item.website ?? "#"}
                hrefAriaLabel={visit(item.name)}
              />
            ))}
          </div>
        </div>
      )}

      {silver.length > 0 && (
        <div>
          <TierHeading label={tierLabels.silver} />
          <div className="grid grid-cols-2 gap-0">
            {silver.map((item) => (
              <Card
                key={item.id}
                imageOnly
                image={item.image}
                imageAlt={item.name}
                href={item.website ?? "#"}
                hrefAriaLabel={visit(item.name)}
              />
            ))}
          </div>
        </div>
      )}

      {bronze.length > 0 && (
        <div>
          <TierHeading label={tierLabels.bronze} />
          <div className="grid grid-cols-2 gap-0 sm:grid-cols-6 lg:grid-cols-4">
            {bronze.map((item, i) => (
              <div key={item.id} className={bronzeColSpan(i)}>
                <Card
                  imageOnly
                  image={item.image}
                  imageAlt={item.name}
                  href={item.website ?? "#"}
                  hrefAriaLabel={visit(item.name)}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
