import { getToday, getYear } from "@/lib/utils";
import { getCoaches } from "@/lib/coaches";
import { getClubs } from "@/lib/clubs";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { getRegistrationCount, isSeedingComplete } from "@/lib/registrations";
import { getAllMatches, sortMatchesForDisplay } from "@/lib/matches";
import { getAllTeams } from "@/lib/teams";
import { getCategories, getCategoryYearStatusList, categoriesConfirmedForYear } from "@/lib/categories";
import { getPrizeAmounts } from "@/lib/prizes";
import { getImportantDates } from "@/lib/importantDatesData";
import { getCommunityMediaPosts } from "@/lib/communityMedia";
import { FadeIn } from "@/app/components/animations/FadeIn";
import { Hero } from "@/app/home/Hero";
import { TournamentStatsSection } from "@/app/home/TournamentStatsSection";
import { TodaysMatchesSection } from "@/app/home/TodaysMatchesSection";
import { TournamentScheduleSection } from "@/app/home/TournamentScheduleSection";
import { EventSection } from "@/app/home/EventSection";
import { SponsorsSection } from "@/app/home/SponsorsSection";
import { CommunityPartnersSection } from "@/app/home/CommunityPartnersSection";
import { ClubsSection } from "@/app/home/ClubsSection";
import { LessonsSection } from "@/app/home/LessonsSection";

export default async function Home() {
  const today = getToday();
  const currentYear = getYear();

  const tournamentEntry = getImportantDates(currentYear).find((e) => e.label === "Tournament" && e.type === "range");
  const finalEntry = getImportantDates(currentYear).find((e) => e.label === "Final" && e.type === "date");
  const tournamentStart = tournamentEntry?.type === "range" ? tournamentEntry.startDate : null;
  const hideAfter = finalEntry?.type === "date" ? (finalEntry.rainDate ?? finalEntry.date) : null;
  const showStats = tournamentStart !== null && hideAfter !== null && today >= tournamentStart && today <= hideAfter;

  const [sponsorsItems, communityPartners, partnerClubs, coachesItems, registrantCount, seedingDone, allMatches, allTeams, categories, categoryStatuses, eventPhotos] = await Promise.all([
    getSponsors().catch(() => []),
    getCommunityPartners().catch(() => []),
    getClubs().catch(() => []),
    getCoaches().catch(() => []),
    getRegistrationCount().catch(() => 0),
    isSeedingComplete().catch(() => false),
    getAllMatches().catch(() => []),
    showStats ? getAllTeams().catch(() => []) : Promise.resolve([]),
    showStats ? getCategories().catch(() => []) : Promise.resolve([]),
    showStats ? getCategoryYearStatusList(currentYear).catch(() => []) : Promise.resolve([]),
    getCommunityMediaPosts().catch(() => []),
  ]);

  const eventPreviewPhotos = eventPhotos
    .slice(0, 5)
    .map((p) => ({ image: p.imageUrl, title: p.title }));

  const hasMatchesThisYear = allMatches.some((m) => m.tournamentYear === currentYear);

  const todayMatches = sortMatchesForDisplay(
    allMatches.filter((m) => m.tournamentYear === currentYear && m.date === today),
  );

  let statsProps = null;
  if (showStats) {
    const activeCategories = categoriesConfirmedForYear(categories, categoryStatuses);
    const currentYearTeams = allTeams.filter((t) => t.tournamentYear === currentYear);

    const playerNames = new Set<string>();
    for (const team of currentYearTeams) {
      if (team.member1NameEn) playerNames.add(team.member1NameEn);
      if (team.member2NameEn) playerNames.add(team.member2NameEn);
    }

    const teamsByCategory = new Map<string, number>();
    for (const team of currentYearTeams) {
      teamsByCategory.set(team.categoryId, (teamsByCategory.get(team.categoryId) ?? 0) + 1);
    }

    let prizePool = 0;
    for (const cat of activeCategories) {
      const count = teamsByCategory.get(cat.id) ?? 0;
      const prizes = getPrizeAmounts(count, currentYear, cat.isDoubles);
      if (prizes) prizePool += prizes.first + prizes.second + prizes.third + prizes.fourth;
    }

    const finalDateStr = finalEntry?.type === "date" ? finalEntry.date : null;
    const daysToFinal = finalDateStr
      ? Math.max(0, Math.round((new Date(finalDateStr + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000))
      : 0;

    statsProps = {
      categories: activeCategories.length,
      competingPlayers: playerNames.size,
      teams: currentYearTeams.length,
      totalMatches: allMatches.filter((m) => m.tournamentYear === currentYear).length,
      prizePool,
      daysToFinal,
    };
  }

  return (
    <>
      <Hero />
      <FadeIn>
        <TodaysMatchesSection todayMatches={todayMatches} />
      </FadeIn>
      <FadeIn>
        <EventSection photos={eventPreviewPhotos} />
      </FadeIn>
      {statsProps && <TournamentStatsSection {...statsProps} />}
      <FadeIn>
        <TournamentScheduleSection />
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
