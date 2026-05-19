import { cache } from "react";
import { resolveLocale, siteContent, type Locale } from "./content";

// Per-request mutable store backed by React cache(). The layout calls setRequestLocale()
// before any page renders, so all server components in the tree can read the locale without
// touching params themselves.
const getStore = cache(() => ({ locale: "en" as Locale }));

export function setRequestLocale(localeParam: string) {
  getStore().locale = resolveLocale(localeParam);
}

export function getRequestLocale(): Locale {
  return getStore().locale;
}

export function getRequestContent() {
  return siteContent[getStore().locale];
}
