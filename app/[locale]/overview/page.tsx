import { getCategories } from "@/lib/categories";
import { getSponsors } from "@/lib/sponsors";
import { siteContent } from "@/lib/content";
import { getImportantDates } from "@/lib/importantDatesData";
import { getYear } from "@/lib/utils";
import { OverviewHub } from "@/app/overview/OverviewHub";

export default async function OverviewPage() {
  const [categoriesFromDb, sponsors] = await Promise.all([getCategories(), getSponsors()]);

  const hostLookup = siteContent.en.overviewPage.overview.hostSponsorLookupName.trim().toLowerCase();
  const hostSponsor = sponsors.find((s) => {
    const n = s.name.trim().toLowerCase();
    return n === hostLookup || n.includes(hostLookup);
  });

  const drawEntry = getImportantDates(getYear()).find((e) => e.label === "Draw publish");
  const drawDate = drawEntry?.type === "date" ? drawEntry.date : null;
  const today = new Date().toISOString().slice(0, 10);
  const showCategories = drawDate ? today >= drawDate : false;

  return (
    <OverviewHub
      categories={categoriesFromDb}
      hostSponsorWebsite={hostSponsor?.website ?? undefined}
      showCategories={showCategories}
    />
  );
}
