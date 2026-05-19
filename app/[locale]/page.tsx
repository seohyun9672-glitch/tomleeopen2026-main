import { getCoaches } from "@/lib/coaches";
import { getClubs } from "@/lib/clubs";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { FadeIn } from "@/app/components/animations/FadeIn";
import { Hero } from "@/app/home/Hero";
import { ScheduleSection } from "@/app/home/ScheduleSection";
import { SponsorsSection } from "@/app/home/SponsorsSection";
import { CommunityPartnersSection } from "@/app/home/CommunityPartnersSection";
import { ClubsSection } from "@/app/home/ClubsSection";
import { LessonsSection } from "@/app/home/LessonsSection";

export default async function Home() {
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
    getClubs().catch(() => []),
    getCoaches().catch(() => []),
  ]);

  return (
    <>
      <Hero />
      <FadeIn>
        <ScheduleSection todayMatches={todayMatches} />
      </FadeIn>
      <FadeIn>
        <SponsorsSection sponsors={sponsorsItems} />
      </FadeIn>
      <FadeIn>
        <CommunityPartnersSection communityPartners={communityPartners} />
      </FadeIn>
      <FadeIn>
        <ClubsSection partnerClubs={partnerClubs} />
      </FadeIn>
      <FadeIn>
        <LessonsSection coachesItems={coachesItems} />
      </FadeIn>
    </>
  );
}
