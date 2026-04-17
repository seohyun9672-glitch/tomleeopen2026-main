import { GridContainer } from "@/app/home/GridContainer";
import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";

type CommunityPartner = {
  name: string;
  image: string | null;
  href?: string;
};

type CommunityPartnersSectionProps = {
  title: string;
  note?: string;
  communityPartners: CommunityPartner[];
  content: { shared: { aria: { visit: (name: string) => string } } };
};

function communityColSpan(index: number): string {
  return index < 4 ? "col-span-1 sm:col-span-3" : "col-span-1 sm:col-span-4";
}

export function CommunityPartnersSection({
  title,
  note,
  communityPartners,
  content,
}: CommunityPartnersSectionProps) {
  return (
    <div className="bg-page-with-grid w-full py-[var(--layout-gap)]">
      <GridContainer className="!py-0">
        <Section title={title} note={note} titleClassName="text-[var(--foreground)]">
          <div className="grid grid-cols-2 gap-0 sm:grid-cols-12">
            {communityPartners.map((item, i) => (
              <div key={i} className={communityColSpan(i)}>
                <Card
                  imageOnly
                  image={item.image}
                  imageAlt={item.name}
                  href={item.href}
                  hrefAriaLabel={content.shared.aria.visit(item.name)}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </Section>
      </GridContainer>
    </div>
  );
}
