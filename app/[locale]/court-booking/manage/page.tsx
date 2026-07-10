import { ManageLookupHub } from "@/app/court-booking/ManageLookupHub";
import { ManageBookingHub } from "@/app/court-booking/ManageBookingHub";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (email) return <ManageBookingHub email={decodeURIComponent(email)} />;
  return <ManageLookupHub />;
}
