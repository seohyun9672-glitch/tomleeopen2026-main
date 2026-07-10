import { getCategories } from "@/lib/categories";
import { RegistrationManageHub } from "@/app/registration/RegistrationManageHub";

export default async function RegistrationManagePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const categories = await getCategories();
  return <RegistrationManageHub categories={categories} initialEmail={email ?? ""} />;
}
