import type { Locale } from "@/lib/content";
import { siteContent } from "@/lib/content";
import { getCoaches } from "@/lib/coaches";
import { getPartnerClubs } from "@/lib/partnerClubsData";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { FadeIn } from "@/app/components/animations/FadeIn";
import { Hero } from "@/app/home/Hero";
import { ScheduleSection } from "@/app/home/ScheduleSection";
import { SponsorsSection } from "@/app/home/SponsorsSection";
import { CommunityPartnersSection } from "@/app/home/CommunityPartnersSection";
import { ClubsSection } from "@/app/home/ClubsSection";
import { LessonsSection } from "@/app/home/LessonsSection";

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];
  const hp = content.homePage;
  const scheduleHref = hp.hero.navLinks.find((l) => /\/schedule$/.test(l.href))?.href ?? hp.hero.navLinks[0].href;

  const todayMatches: {
    id: string;
    category: string;
    team1: string;
    team2: string;
    court?: string;
    time?: string;
  }[] = [];

  const [sponsorsItems, communityPartners, partnerClubs, coachesItems] = await Promise.all([
    getSponsors().catch(() => []),
    getCommunityPartners().catch(() => []),
    getPartnerClubs().catch(() => []),
    getCoaches().catch(() => []),
  ]);

  return (
    <>
      <Hero hero={hp.hero} />
      <FadeIn>
        <ScheduleSection hp={hp} todayMatches={todayMatches} scheduleHref={scheduleHref} />
      </FadeIn>
      <FadeIn>
        <SponsorsSection
          title={hp.sectionTitles.sponsors}
          note={hp.sectionNotes.sponsors}
          sponsors={sponsorsItems}
          tierLabels={hp.sponsorTierLabels}
          content={content}
        />
      </FadeIn>
      <FadeIn>
        <CommunityPartnersSection
          title={hp.sectionTitles.communityPartners}
          note={hp.sectionNotes.communityPartners}
          communityPartners={communityPartners}
          content={content}
        />
      </FadeIn>
      <FadeIn>
        <ClubsSection
          title={hp.sectionTitles.clubs}
          note={hp.sectionNotes.clubs}
          partnerClubs={partnerClubs}
          locale={locale}
          content={content}
        />
      </FadeIn>
      <FadeIn>
        <LessonsSection
          title={hp.sectionTitles.lessons}
          coachesItems={coachesItems}
          content={content}
        />
      </FadeIn>
    </>
  );
}
