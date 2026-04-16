import { LocaleProvider } from "@/lib/locale-context";
import { AppScrollLayout } from "@/app/components/AppScrollLayout";
import { TopHeader } from "@/app/components/topheader/TopHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider initialLocale="en">
      <header
        className="fixed top-0 right-0 left-0 z-[110] h-14 w-full shrink-0 border-b border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)]"
        aria-hidden
      />
      <TopHeader />
      <AppScrollLayout>{children}</AppScrollLayout>
    </LocaleProvider>
  );
}
