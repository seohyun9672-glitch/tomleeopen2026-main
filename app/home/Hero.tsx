"use client";

import Image from "next/image";
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

const shadow = "drop-shadow(0 12px 32px color-mix(in srgb, var(--color-primary-blue-900) 65%, transparent))";
const ballClass = "absolute z-0 pointer-events-none w-[160px] h-[160px] xs:w-[180px] xs:h-[180px] sm:w-[220px] sm:h-[220px] lg:w-[280px] lg:h-[280px] xl:w-[280px] xl:h-[280px]";

export function Hero({ hero, locale }: { hero: HeroContent; locale?: string }) {
  const { title, dateRange, navLinks } = hero;
  const { line1, line2 } = splitHeroTitle(title);
  const isKorean = locale === "ko";

  return (
    <section className="bg-hero-with-grid flex items-center py-16 md:py-20 relative overflow-hidden min-h-[520px] md:min-h-[540px]">

      {/* Ball 1 — top-right, clipped at top */}
      <div className={ballClass} style={{ top: "-8%", right: "1%", filter: shadow }}>
        <Image src="/tennis-ball.png" alt="" fill sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 280px" className="object-contain" />
      </div>

      {/* Ball 2 — hidden <320px, clipped right at xs, positioned at sm+ */}
      <div className={`${ballClass} hidden xs:block xs:-right-[15%] sm:right-[20%] lg:right-[25%] xl:right-[25%]`} style={{ top: "50%", transform: "translateY(-50%)", filter: shadow }}>
        <Image src="/tennis-ball.png" alt="" fill sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 280px" className="object-contain" />
      </div>

      {/* Ball 3 — bottom-right, clipped at bottom */}
      <div className={ballClass} style={{ bottom: "-15%", right: "clamp(30px, 9%, 180px)", filter: shadow }}>
        <Image src="/tennis-ball.png" alt="" fill sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 280px" className="object-contain" />
      </div>

      {/* Content */}
      <div className="page-shell relative z-10">
        <div className="flex flex-col item-center gap-[var(--section-gap)] h-full md:max-w-[55%]">
          <h1 className="hero-title">
            {isKorean ? `${line1} ${line2}` : <>{line1} <br />{line2}</>}
          </h1>
          <h2 className="hero-subtitle">{dateRange}</h2>
          {navLinks.length > 0 && (
            <div className="flex flex-col gap-[var(--content-gap)] md:flex-row">
              {navLinks.map(({ href, label }) => (
                <Button
                  key={href}
                  href={href}
                  variant="secondary"
                  size="medium"
                  className="w-fit"
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
