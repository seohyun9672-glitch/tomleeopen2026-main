import type { Locale } from "@/lib/content";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/app/components/PageContainer";
import { AdminLoginForm } from "./AdminLoginForm";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminLoginPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const localePrefix = locale === "ko" ? "/ko" : "";

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    redirect(`${localePrefix}/admin`);
  }

  return (
    <PageContainer>
      <AdminLoginForm />
    </PageContainer>
  );
}
