import { getCoaches } from "@/lib/coaches";
import { getClubs } from "@/lib/clubs";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { getAllMatches } from "@/lib/matches";
import { Hero } from "./home/Hero";
import { ScheduleSection } from "./home/ScheduleSection";
import { SponsorsSection } from "./home/SponsorsSection";
import { CommunityPartnersSection } from "./home/CommunityPartnersSection";
import { ClubsSection } from "./home/ClubsSection";
import { LessonsSection } from "./home/LessonsSection";

export default async function Home() {
  const todayMatches: {
    id: string;
    category: string;
    team1: string;
    team2: string;
    court?: string;
    time?: string;
  }[] = [];

  const currentYear = new Date().getFullYear();

  const [sponsorsItems, communityPartners, partnerClubs, coachesItems, allMatches] = await Promise.all([
    getSponsors().catch(() => []),
    getCommunityPartners().catch(() => []),
    getClubs().catch(() => []),
    getCoaches().catch(() => []),
    getAllMatches().catch(() => []),
  ]);

  const hasMatchesThisYear = allMatches.some((m) => m.tournamentYear === currentYear);

  return (
    <>
      <Hero />
      <ScheduleSection todayMatches={todayMatches} hasMatchesThisYear={hasMatchesThisYear} />
      <SponsorsSection sponsors={sponsorsItems} />
      <CommunityPartnersSection communityPartners={communityPartners} />
      <ClubsSection partnerClubs={partnerClubs} />
      <LessonsSection coachesItems={coachesItems} />
    </>
  );
}
