import { Section } from "@/app/components/Section";
import { Button } from "@/app/components/ui/Button";
import { coachDisplayName } from "@/lib/coaches";

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
    <Section title={title} zebra={false}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)]">
        {coachesItems.map((coach) => {
          const displayName = coachDisplayName(coach);
          const telDigits = (coach.phone ?? "").replace(/\D/g, "");
          return (
            <article
              key={coach.id}
              className="flex flex-col gap-4 border border-[color:var(--outline-blue-soft)] bg-white px-6 py-6 transition-colors hover:border-[color:var(--color-primary-blue-300)]"
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-blue)]">
                  {formatRoleLabel(content.shared.labels.coach)}
                </span>
                <h3 className="text-xl font-semibold leading-snug text-[var(--foreground-on-light)] m-0">
                  {formatCoachName(displayName)}
                </h3>
              </div>
              {telDigits && (
                <Button
                  href={`tel:${telDigits}`}
                  variant="secondary"
                  size="medium"
                  className="w-full"
                  aria-label={content.shared.aria.contact(displayName)}
                >
                  {content.shared.buttons.contact}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </Section>
  );
}
