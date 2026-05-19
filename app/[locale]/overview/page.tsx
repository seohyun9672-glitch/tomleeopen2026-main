import { getCategories } from "@/lib/categories";
import { getSponsors } from "@/lib/sponsors";
import { siteContent } from "@/lib/content";
import { OverviewHub } from "@/app/overview/OverviewHub";

export default async function OverviewPage() {
  const [categoriesFromDb, sponsors] = await Promise.all([getCategories(), getSponsors()]);

  const hostLookup = siteContent.en.overviewPage.overview.hostSponsorLookupName.trim().toLowerCase();
  const hostSponsor = sponsors.find((s) => {
    const n = s.name.trim().toLowerCase();
    return n === hostLookup || n.includes(hostLookup);
  });

  return (
    <OverviewHub
      categories={categoriesFromDb}
      hostSponsorWebsite={hostSponsor?.website ?? undefined}
    />
  );
}
