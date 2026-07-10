"use client";

import { useLocale } from "@/lib/locale-context";
import { Section } from "@/app/components/Section";
import { Callout } from "@/app/components/ui/Callout";
import { getImportantDates } from "@/lib/importantDatesData";
import { getRegistrationStatus } from "@/lib/registrationStatus";
import { getToday, getYear } from "@/lib/utils";

type Props = {
  registrantCount: number;
  seedingDone: boolean;
};

type Update = {
  title: string;
  message: string;
  variant: "info" | "success" | "warning";
  icon: React.ReactNode;
  linkLabel?: string;
  href?: string;
};

function UsersIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 13c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 7c1.105 0 2 .672 2 2.5M14.5 13c0-1.828-.895-3-2-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1.5V4M11 1.5V4M1.5 7h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function RegistrationStatsSection({ registrantCount, seedingDone }: Props) {
  const { t } = useLocale();
  const u = t.homePage.tournamentUpdates;

  const { status } = getRegistrationStatus();
  const today = getToday();

  const regEntry = getImportantDates(getYear()).find((e) => e.label === "Registration" && e.type === "range");
  const daysLeft = regEntry && regEntry.type === "range"
    ? (() => {
        const [ey, em, ed] = regEntry.endDate.split("-").map(Number);
        const [ty, tm, td] = today.split("-").map(Number);
        const end = new Date(ey, em - 1, ed).getTime();
        const start = new Date(ty, tm - 1, td).getTime();
        return Math.max(0, Math.ceil((end - start) / 86_400_000));
      })()
    : 0;

  const drawPublishEntry = getImportantDates(getYear()).find((e) => e.label === "Draw publish" && e.type === "date");
  const drawPublishDate = drawPublishEntry?.type === "date" ? drawPublishEntry.date : null;
  const drawPublished = seedingDone || (drawPublishDate !== null && drawPublishDate < today);
  const isDrawDay = !drawPublished && drawPublishDate === today;

  const updates: Update[] = [];

  if (status === "open") {
    updates.push({
      variant: "success",
      icon: <UsersIcon />,
      title: u.registrationOpen.title,
      message: u.registrationOpen.message(registrantCount, daysLeft),
    });
  }

  if (isDrawDay) {
    updates.push({
      variant: "info",
      icon: <CalendarIcon />,
      title: u.drawDay.title,
      message: u.drawDay.message,
    });
  }

  if (drawPublished) {
    updates.push({
      variant: "success",
      icon: <CalendarIcon />,
      title: u.drawPublished.title,
      message: u.drawPublished.message,
      linkLabel: u.drawPublished.linkLabel,
      href: "/draws",
    });
  }

  return (
    <Section title={u.sectionTitle} zebra>
      <div className="flex flex-col gap-3">
        {updates.map((update, i) => (
          <Callout key={i} title={update.title} message={update.message} variant={update.variant} icon={update.icon} linkLabel={update.linkLabel} href={update.href} />
        ))}
      </div>
    </Section>
  );
}
