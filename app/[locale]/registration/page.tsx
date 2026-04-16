import type { Locale } from "@/lib/content";
import { siteContent } from "@/lib/content";
import { getCategories } from "@/lib/categories/db";
import { getClubCodes } from "@/lib/clubs";
import { PageContainer } from "@/app/components/PageContainer";
import { RegistrationPageClient } from "@/app/registration/RegisterModal";

type Props = { params: Promise<{ locale: string }> };

export default async function RegistrationPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const [categories, clubCodes] = await Promise.all([
    getCategories().catch(() => []),
    getClubCodes().catch(() => []),
  ]);

  return (
    <PageContainer title={content.registrationPage.heroTitle}>
      <div className="mx-auto w-full max-w-[700px]">
        <RegistrationPageClient categories={categories} clubCodes={clubCodes} />
      </div>
    </PageContainer>
  );
}
