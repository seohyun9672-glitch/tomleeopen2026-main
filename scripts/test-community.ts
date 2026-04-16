import { getCommunityPartners } from "../lib/getCommunityPartners";
import { getSponsors } from "../lib/sponsors";
async function main() {
  const partners = await getCommunityPartners();
  console.log("COMMUNITY PARTNERS:", JSON.stringify(partners, null, 2));
  const sponsors = await getSponsors();
  console.log("SPONSORS:", JSON.stringify(sponsors.map(s => ({name: s.name, image: s.image})), null, 2));
}
main().catch(console.error);
