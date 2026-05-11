/**
 * Site content — bilingual { en, ko } per domain; each page module owns its copy and `heroTitle`.
 * Server components: `cookies()` + `siteContent[locale]` (see rules/overview pages).
 * Client components: `useLocale().t`
 */
import { header } from "./header";
import { shared } from "./shared";
import { homePage } from "./homePage";
import { schedulePage } from "./schedulePage";
import { matchUi } from "./matchUi";
import { mediaPage } from "./mediaPage";
import { playersPage } from "./playersPage";
import { overviewPage } from "./overviewPage";
import { drawsPage } from "./drawsPage";
import { honourRollPage } from "./honourRollPage";
import { clubs } from "./clubs";
import { registrationPage } from "./registrationPage";
import { registrationForm } from "./registrationForm";
import { rulesPage } from "./rulesPage";

/** Full bilingual site content. Use `siteContent[locale]` in locale-context. */
export const siteContent = {
  en: {
    ...header.en,
    ...shared.en,
    ...homePage.en,
    ...schedulePage.en,
    ...matchUi.en,
    ...mediaPage.en,
    ...playersPage.en,
    ...overviewPage.en,
    ...drawsPage.en,
    ...honourRollPage.en,
    ...clubs.en,
    ...registrationPage.en,
    ...registrationForm.en,
    ...rulesPage.en,
  },
  ko: {
    ...header.ko,
    ...shared.ko,
    ...homePage.ko,
    ...schedulePage.ko,
    ...matchUi.ko,
    ...mediaPage.ko,
    ...playersPage.ko,
    ...overviewPage.ko,
    ...drawsPage.ko,
    ...honourRollPage.ko,
    ...clubs.ko,
    ...registrationPage.ko,
    ...registrationForm.ko,
    ...rulesPage.ko,
  },
} as const;

export type SiteContent = typeof siteContent;
export type Locale = keyof SiteContent;
export type Messages = SiteContent["en"];

/** English-only shorthand for server components (no locale switching needed). */
export const content: Messages = siteContent.en;

// Named exports for direct per-domain imports
export { header, shared, homePage, schedulePage, matchUi, mediaPage, playersPage, overviewPage, drawsPage, honourRollPage, clubs, registrationPage, registrationForm, rulesPage };
