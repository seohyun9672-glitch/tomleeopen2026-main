import { getCategories } from "@/lib/categories";
import { RegistrationManageHub } from "@/app/registration/RegistrationManageHub";

export default async function RegistrationManagePage() {
  const categories = await getCategories();
  return <RegistrationManageHub categories={categories} />;
}
