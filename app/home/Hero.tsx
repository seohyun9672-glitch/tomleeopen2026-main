import { Button } from "@/app/components/ui/Button";

type NavLink = { href: string; label: string };

type HeroContent = {
  title: string;
  dateRange: string;
  navLinks: readonly NavLink[];
};

function splitHeroTitle(title: string) {
  const words = title.trim().split(/\s+/);
  return words.length > 1
    ? { line1: words[0], line2: words.slice(1).join(" ") }
    : { line1: words[0], line2: "" };
}

export function Hero({ hero }: { hero: HeroContent }) {
  const { title, dateRange, navLinks } = hero;
  const { line1, line2 } = splitHeroTitle(title);

  return (
    <section className="bg-hero-with-grid py-12">
      <div className="page-shell grid items-center gap-[var(--content-gap)] lg:grid-cols-2">

        <div className="flex flex-col gap-[var(--section-gap)]">
          <h1 className="text-title !text-[var(--color-text-on-brand)] uppercase">
            {line1} {line2}
          </h1>

          <p className="text-subtitle text-white">{dateRange}</p>

          {navLinks.length > 0 && (
            <div className="flex flex-wrap gap-[var(--content-gap)]">
              {navLinks.map(({ href, label }) => (
                <Button key={href} href={href} variant="secondary" size="medium" className="w-fit">
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <img src="/tennis-ball.png" alt="Tennis ball" className="w-48 md:w-64 lg:w-80" />
        </div>
      </div>
    </section>
  );
}
