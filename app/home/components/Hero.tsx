import { Grid } from "@/app/components/layout/Grid";
import { GridContainer } from "@/app/components/layout/GridContainer";
import { Button } from "@/app/components/ui/Button";

type NavLink = {
  href: string;
  label: string;
};

type HeroContent = {
  title: string;
  dateRange: string;
  navLinks: NavLink[];
};

type HeroProps = {
  hero: HeroContent;
};

function splitHeroTitle(title: string): { line1: string; line2: string } {
  const trimmed = title.trim();
  const firstSpaceIndex = trimmed.indexOf(" ");

  if (firstSpaceIndex === -1) {
    return {
      line1: trimmed,
      line2: "\u00a0",
    };
  }

  return {
    line1: trimmed.slice(0, firstSpaceIndex),
    line2: trimmed.slice(firstSpaceIndex + 1).trim(),
  };
}

export function Hero({ hero }: HeroProps) {
  const { line1, line2 } = splitHeroTitle(hero.title);

  return (
    <div className="bg-hero-with-grid w-full">
      <GridContainer flushTop className="pb-0">
        <section className="relative w-full min-w-0 overflow-hidden pb-[var(--section-gap)] pt-[var(--section-gap)] text-[var(--color-text-on-brand)] sm:pb-[var(--layout-gap)] sm:pt-[var(--layout-gap)] md:min-h-[min(42vh,20rem)] lg:min-h-[min(44vh,22rem)]">
          <Grid>
            <div className="col-span-4 flex min-w-0 flex-col gap-[var(--content-gap)] md:col-span-6 md:gap-[var(--section-gap)] lg:col-span-12 lg:gap-[var(--layout-gap)]">
              <h1 className="text-title m-0 !text-[var(--color-text-on-brand)] uppercase">
                <span className="flex flex-col items-start gap-[var(--element-gap)] sm:gap-[var(--content-gap)] lg:gap-[var(--section-gap)]">
                  <span className="block leading-none">{line1}</span>
                  <span className="block leading-none">{line2}</span>
                </span>
              </h1>

              <p className="text-subtitle m-0 !text-white">{hero.dateRange}</p>

              <div className="relative z-[1] flex w-full max-w-[50%] flex-col items-stretch gap-[var(--content-gap)] md:flex-row md:flex-wrap md:items-center md:gap-[var(--section-gap)]">
                {hero.navLinks.map((item) => (
                  <Button
                    key={item.href}
                    href={item.href}
                    variant="secondary"
                    size="medium"
                    className="w-full md:w-auto"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </Grid>
        </section>
      </GridContainer>
    </div>
  );
}