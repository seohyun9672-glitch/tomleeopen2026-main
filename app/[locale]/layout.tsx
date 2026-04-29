import { AppScrollLayout } from "../components/AppScrollLayout";
import { TopHeader } from "../components/topheader/TopHeader";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params: _ }: Props) {
  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-[110] h-14 w-full shrink-0 border-b border-[color:var(--color-border-on-brand)] bg-[var(--header-bg)]"
        aria-hidden
      />
      <TopHeader />
      <AppScrollLayout>{children}</AppScrollLayout>
    </>
  );
}
