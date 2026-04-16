import { getCommunityPartners } from "@/lib/getCommunityPartners";

/** @deprecated Use getCommunityPartners from lib/getCommunityPartners instead */
export async function getSupportingBusinesses() {
  return getCommunityPartners();
}

/** For home page cards: { name, image, href } */
export async function getSupportingBusinessesForHome() {
  return getCommunityPartners();
}
