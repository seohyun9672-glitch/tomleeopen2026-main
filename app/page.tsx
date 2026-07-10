import { getToday, getYear } from "@/lib/utils";
import { getCoaches } from "@/lib/coaches";
import { getClubs } from "@/lib/clubs";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { getAllMatches } from "@/lib/matches";
import { getAllTeams } from "@/lib/teams";
import { getCategories, getCategoryYearStatusList, categoriesConfirmedForYear } from "@/lib/categories";
import { getPrizeAmounts } from "@/lib/prizes";
import { getImportantDates } from "@/lib/importantDatesData";
import { Hero } from "./home/Hero";
import { TournamentStatsSection } from "./home/TournamentStatsSection";
import { ScheduleSection } from "./home/ScheduleSection";
import { SponsorsSection } from "./home/SponsorsSection";
import { CommunityPartnersSection } from "./home/CommunityPartnersSection";
import { ClubsSection } from "./home/ClubsSection";
import { LessonsSection } from "./home/LessonsSection";

export default async function Home() {
  const today = getToday();
  const currentYear = getYear();

  const tournamentEntry = getImportantDates(currentYear).find((e) => e.label === "Tournament" && e.type === "range");
  const finalEntry = getImportantDates(currentYear).find((e) => e.label === "Final" && e.type === "date");
  const tournamentStart = tournamentEntry?.type === "range" ? tournamentEntry.startDate : null;
  const hideAfter = finalEntry?.type === "date" ? (finalEntry.rainDate ?? finalEntry.date) : null;
  const showStats = tournamentStart !== null && hideAfter !== null && today >= tournamentStart && today <= hideAfter;

  const [sponsorsItems, communityPartners, partnerClubs, coachesItems, allMatches, allTeams, categories, categoryStatuses] = await Promise.all([
    getSponsors().catch(() => []),
    getCommunityPartners().catch(() => []),
    getClubs().catch(() => []),
    getCoaches().catch(() => []),
    getAllMatches().catch(() => []),
    showStats ? getAllTeams().catch(() => []) : Promise.resolve([]),
    showStats ? getCategories().catch(() => []) : Promise.resolve([]),
    showStats ? getCategoryYearStatusList(currentYear).catch(() => []) : Promise.resolve([]),
  ]);

  const hasMatchesThisYear = allMatches.some((m) => m.tournamentYear === currentYear);

  const todayMatches = allMatches.filter(
    (m) => m.tournamentYear === currentYear && m.date === today,
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
      {statsProps && <TournamentStatsSection {...statsProps} />}
      <ScheduleSection todayMatches={todayMatches} hasMatchesThisYear={hasMatchesThisYear} />
      <SponsorsSection sponsors={sponsorsItems} />
      <CommunityPartnersSection communityPartners={communityPartners} />
      <ClubsSection partnerClubs={partnerClubs} />
      <LessonsSection coachesItems={coachesItems} />
    </>
  );
}
