import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageContainer } from "@/app/components/PageContainer";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/admin");
  }
  return (
    <PageContainer>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12">
        <AdminLoginForm />
      </div>
    </PageContainer>
  );
}
