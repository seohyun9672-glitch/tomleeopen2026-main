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

function communityColSpan(index: number, total: number): string {
  if (total % 2 === 0) return "col-span-1 sm:col-span-3";
  return index < 4 ? "col-span-1 sm:col-span-3" : "col-span-1 sm:col-span-4";
}

export function CommunityPartnersSection({ communityPartners }: CommunityPartnersSectionProps) {
  const { t } = useLocale();
  const title = t.homePage.sectionTitles.communityPartners;
  const visit = t.shared.aria.visit;

  return (
    <Section title={title} zebra={false}>
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-12">
        {communityPartners.map((item, i) => (
          <div key={i} className={communityColSpan(i, communityPartners.length)}>
            <Card
              imageOnly
              image={item.image}
              imageAlt={item.name}
              href={item.href}
              hrefAriaLabel={visit(item.name)}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
