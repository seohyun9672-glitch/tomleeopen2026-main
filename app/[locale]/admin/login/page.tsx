import type { Locale } from "@/lib/content";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageContainer } from "@/app/components/PageContainer";
import { AdminLoginForm } from "@/app/admin/login/AdminLoginForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminLoginPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const localePrefix = locale === "ko" ? "/ko" : "";

  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(`${localePrefix}/admin`);
  }
  return (
    <PageContainer>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12">
        <AdminLoginForm />
      </div>
    </PageContainer>
  );
}
