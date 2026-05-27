/**
 * Returns the locale-appropriate display name, falling back to the English
 * name when the Korean name is absent. Use this everywhere a player/team name
 * is shown to the user so the fallback is consistent across the codebase.
 */
export function displayName(
  nameEn: string,
  nameKo: string | null | undefined,
  locale: "en" | "ko",
): string {
  if (locale === "ko") return nameKo?.trim() || nameEn;
  return nameEn;
}
