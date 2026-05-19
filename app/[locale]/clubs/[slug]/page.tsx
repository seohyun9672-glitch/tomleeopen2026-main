import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestLocale, getRequestContent } from "@/lib/request-locale";
import { getClubs, getClubSlugs } from "@/lib/clubs";
import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";

type Props = { params: Promise<{ slug: string }> };

const HIDDEN_CLUB_SLUGS = new Set(["sagol", "na", "machang"]);

export async function generateStaticParams() {
  const slugs = await getClubSlugs();
  return ["en", "ko"].flatMap((locale) =>
    slugs.filter((s) => !HIDDEN_CLUB_SLUGS.has(s)).map((slug) => ({ locale, slug })),
  );
}

export default async function ClubDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = getRequestLocale();
  const content = getRequestContent();

  const allClubs = await getClubs();
  const club = allClubs.find((c) => c.slug === slug);
  if (!club || HIDDEN_CLUB_SLUGS.has(club.slug)) notFound();
  const otherClubs = allClubs.filter(
    (c) => c.slug !== slug && !HIDDEN_CLUB_SLUGS.has(c.slug),
  );

  const heroTitle =
    locale === "ko" && club.nameKo?.trim() ? club.nameKo.trim() : club.name;

  return (
    <PageContainer
      title={heroTitle}
      beforeTitle={
        <nav aria-label="Breadcrumb">
          <Link href={locale === "ko" ? "/ko#clubs" : "/#clubs"} className="link-default text-sm font-medium">
            <span aria-hidden className="mr-1">
              ←
            </span>
            {content.clubPage.backToClubs}
          </Link>
        </nav>
      }
    >
      <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
        <Section
          title={content.clubPage.about}
        >
          <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border-card)] bg-[var(--color-surface-card)] text-[var(--section-text)] card-elev">
            {club.logo ? (
              <div className="flex flex-col items-start gap-4 p-5 md:flex-row md:items-start md:gap-6 md:p-6">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[color:var(--color-border-card)] bg-[var(--color-surface-muted)] md:h-24 md:w-24">
                  <Image
                    src={club.logo}
                    alt={heroTitle}
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 96px, 80px"
                  />
                </div>
                <div className="w-full min-w-0 text-left md:flex-1">
                  <p className="text-body m-0 whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                    {club.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 md:p-6">
                <p className="text-body m-0 whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                  {club.description}
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section
          title={content.shared.sectionTitles.otherClubs}
        >
          <div className="rounded-2xl border border-[color:var(--color-border-card)] bg-[var(--color-surface-card)] p-4 text-[var(--section-text)] md:p-5 card-elev">
            <nav aria-label={content.shared.sectionTitles.otherClubs}>
              <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 md:flex-nowrap md:gap-x-0 md:gap-y-0">
                {otherClubs.map((other) => {
                  const otherLabel =
                    locale === "ko" && other.nameKo?.trim() ? other.nameKo.trim() : other.name;
                  return (
                    <li
                      key={other.slug}
                      className="md:border-r md:border-[color:var(--color-border-card)] md:pl-4 md:pr-4 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                    >
                      <Link
                        href={`${locale === "ko" ? "/ko" : ""}/clubs/${other.slug}`}
                        className="link-default text-sm font-medium underline-offset-2 hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset-canvas)]"
                        aria-label={content.shared.aria.viewDetail(otherLabel)}
                      >
                        {otherLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
