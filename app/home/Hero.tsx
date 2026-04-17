import { Grid } from "@/app/components/layout/Grid";
import { GridContainer } from "@/app/home/GridContainer";
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
      <GridContainer className="lg:col-span-12">
        <section className="relative w-full min-w-0 text-[var(--color-text-on-brand) md:min-h-[min(42vh,20rem)] lg:min-h-[min(44vh,22rem)]">
          <Grid>
            <div className="col-span-4 flex min-w-0 flex-col gap-[var(--content-gap)] md:col-span-6 md:gap-[var(--section-gap)] lg:gap-[var(--layout-gap)]">
              <h1 className="text-title m-0 !text-[var(--color-text-on-brand)] uppercase">
                {line1} {line2}
              </h1>
              <h2 className="text-subtitle text-white">{hero.dateRange}</h2>
              <div className="flex w-full flex-col items-stretch gap-[var(--content-gap)] md:flex-row md:flex-wrap">
                {hero.navLinks.map((item) => (
                  <Button
                    key={item.href}
                    href={item.href}
                    variant="secondary"
                    size="medium"
                    className="w-fit"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <img />
            </div>
          </Grid>
        </section>
      </GridContainer>
    </div>
  );
}
