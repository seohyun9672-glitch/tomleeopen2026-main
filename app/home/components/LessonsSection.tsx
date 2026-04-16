import { GridContainer } from "@/app/components/layout/GridContainer";
import { Section } from "@/app/components/Section";
import { Card } from "@/app/components/ui/Card";
import { coachDisplayName, normalizeImagePath } from "@/lib/coaches";

type Coach = Awaited<ReturnType<typeof import("@/lib/coaches").getCoaches>>[number];

type LessonsSectionProps = {
  title: string;
  coachesItems: Coach[];
  content: {
    shared: {
      labels: { coach: string };
      buttons: { contact: string };
      aria: { contact: (name: string) => string };
    };
  };
};

const LESSON_COL_SPAN = "col-span-4 sm:col-span-2 md:col-span-2 lg:col-span-4";

function titleCaseLatinLabel(value: string): string {
  const s = value.trim();
  if (!s || /[^\x00-\x7F]/.test(s)) return value;
  return s
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function formatRoleLabel(value: string): string {
  const t = value.trim();
  if (!t) return value;
  return /^coach$/i.test(t) ? "Coach" : titleCaseLatinLabel(t);
}

function formatCoachName(value: string): string {
  const t = value.trim();
  if (!t) return value;
  if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(t)) return t;
  return t
    .split(/(\s+)/)
    .map((part) =>
      !/^\s+$/.test(part) && /^[A-Za-z]/.test(part)
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part
    )
    .join("");
}

export function LessonsSection({ title, coachesItems, content }: LessonsSectionProps) {
  return (
    <div className="bg-page-with-grid w-full py-[var(--layout-gap)]">
      <GridContainer className="!py-0">
        <Section
          title={title}
          useGrid
          gridClassName="gap-[var(--element-gap)] md:gap-[var(--content-gap)] lg:gap-[var(--content-gap)]"
          titleClassName="text-[var(--foreground)]"
        >
          {coachesItems.map((coach) => {
            const displayName = coachDisplayName(coach);
            const telDigits = (coach.phone ?? "").replace(/\D/g, "");
            return (
              <Card
                key={coach.id}
                className={LESSON_COL_SPAN}
                titleTag="h3"
                title={formatCoachName(displayName)}
                image={normalizeImagePath(coach.image)}
                imageAlt={displayName}
                label={formatRoleLabel(content.shared.labels.coach)}
                labelClassName="uppercase text-[var(--color-primary-blue)] font-[family-name:var(--font-heading)] text-[length:var(--text-h3-display-size)] leading-tight"
                cta={
                  telDigits
                    ? { label: content.shared.buttons.contact, href: `tel:${telDigits}` }
                    : undefined
                }
                ctaAriaLabel={telDigits ? content.shared.aria.contact(displayName) : undefined}
              />
            );
          })}
        </Section>
      </GridContainer>
    </div>
  );
}
