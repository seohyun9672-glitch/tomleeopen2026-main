import { getCategories } from "@/lib/categories";
import { getRegistrationStatus } from "@/lib/registrationStatus";
import { registrationPage } from "@/lib/content/registrationPage";
import { PageContainer } from "@/app/components/PageContainer";
import { Callout } from "@/app/components/ui/Callout";
import { RegistrationForm } from "@/app/registration/RegistrationForm";

export default async function RegistrationNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { status } = getRegistrationStatus();
  const isKo = locale === "ko";
  const rp = isKo
    ? registrationPage.ko.registrationPage
    : registrationPage.en.registrationPage;
  const statusMessage =
    status === "not-open"
      ? { title: rp.notYetOpenTitle, body: rp.notYetOpenMessage }
      : status === "closed"
        ? { title: rp.closedTitle, body: rp.closedMessage }
        : null;

  const categories = statusMessage ? [] : await getCategories();
  const year = new Date().getFullYear();

  return (
    <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
      {statusMessage ? (
        <Callout title={statusMessage.title} message={statusMessage.body} />
      ) : (
        <div className="flex flex-col gap-3">
          <RegistrationForm categories={categories} year={year} />
        </div>
      )}
    </PageContainer>
  );
}
