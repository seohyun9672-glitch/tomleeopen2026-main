import { headers } from "next/headers";
import type { Locale } from "@/lib/content";

/** Read the locale set by middleware from the x-locale request header. */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  return h.get("x-locale") === "ko" ? "ko" : "en";
}
