import { cookies } from "next/headers";
import { siteContent, type Locale } from "@/lib/content";
import { getCoaches } from "@/lib/coaches";
import { getPartnerClubs } from "@/lib/partnerClubsData";
import { getSponsors } from "@/lib/sponsors";
import { getCommunityPartners } from "@/lib/getCommunityPartners";
import { Hero } from "./home/Hero";
import { ScheduleSection } from "./home/ScheduleSection";
import { SponsorsSection } from "./home/SponsorsSection";
import { CommunityPartnersSection } from "./home/CommunityPartnersSection";
import { ClubsSection } from "./home/ClubsSection";
import { LessonsSection } from "./home/LessonsSection";
import { getMenuData } from "@/lib/content/menu";


export default async function Home() {
  const cookieStore = await cookies();
  const locale: Locale =
    cookieStore.get("locale")?.value === "ko" ? "ko" : "en";
  const content = siteContent[locale];
  const hp = content.homePage;

  const todayMatches: {
    id: string;
    category: string;
    team1: string;
    team2: string;
    court?: string;
    time?: string;
  }[] = [];

  const [sponsorsItems, communityPartners, partnerClubs, coachesItems] =
    await Promise.all([
      getSponsors().catch(() => []),
      getCommunityPartners().catch(() => []),
      getPartnerClubs().catch(() => []),
      getCoaches().catch(() => []),
    ]);

const menu = getMenuData(locale);

const scheduleHref =
  menu.primary.find((item) => item.href.endsWith("/schedule"))?.href ??
  menu.homeHero.find((item) => item.href.endsWith("/schedule"))?.href ??
  "/schedule";  
  return (
    <>
      <Hero hero={hp.hero} />
      <ScheduleSection
        hp={hp}
        todayMatches={todayMatches}
        scheduleHref={scheduleHref}
      />{" "}
      <SponsorsSection
        title={hp.sectionTitles.sponsors}
        note={hp.sectionNotes.sponsors}
        sponsors={sponsorsItems}
        tierLabels={hp.sponsorTierLabels}
        content={content}
      />
      <CommunityPartnersSection
        title={hp.sectionTitles.communityPartners}
        note={hp.sectionNotes.communityPartners}
        communityPartners={communityPartners}
        content={content}
      />
      <ClubsSection
        title={hp.sectionTitles.clubs}
        note={hp.sectionNotes.clubs}
        partnerClubs={partnerClubs}
        locale={locale}
        content={content}
      />
      <LessonsSection
        title={hp.sectionTitles.lessons}
        coachesItems={coachesItems}
        content={content}
      />
    </>
  );
}
