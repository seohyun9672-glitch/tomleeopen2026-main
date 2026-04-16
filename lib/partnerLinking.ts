/**
 * Link registration partner free-text (CSV / partnerName) to Player rows by
 * English or Korean name. 2024 import originally only indexed fullNameEn.
 */


export function normPartnerName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Key for partner lookup: normalized spacing + lowercase (Hangul unchanged). */
export function normPartnerLookupKey(s: string): string {
  return normPartnerName(s).toLowerCase();
}

export type PlayerNameRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
};

export type PartnerDisplay = { en: string; ko: string | null };

/** First wins per key (avoid overwriting with duplicate names). */
export function buildPlayerIdByPartnerNameMap(players: PlayerNameRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of players) {
    const en = normPartnerLookupKey(p.fullNameEn);
    if (en && !m.has(en)) m.set(en, p.id);
    if (p.fullNameKo?.trim()) {
      const ko = normPartnerLookupKey(p.fullNameKo);
      if (ko && !m.has(ko)) m.set(ko, p.id);
    }
  }
  return m;
}

/** Map lookup key → display names for admin / public UI when partnerId is missing. */
export function buildPartnerDisplayByLookupKey(players: PlayerNameRow[]): Map<string, PartnerDisplay> {
  const m = new Map<string, PartnerDisplay>();
  for (const p of players) {
    const display: PartnerDisplay = {
      en: normPartnerName(p.fullNameEn),
      ko: p.fullNameKo?.trim() ? normPartnerName(p.fullNameKo) : null,
    };
    const en = normPartnerLookupKey(p.fullNameEn);
    if (en && !m.has(en)) m.set(en, display);
    if (p.fullNameKo?.trim()) {
      const ko = normPartnerLookupKey(p.fullNameKo);
      if (ko && !m.has(ko)) m.set(ko, display);
    }
  }
  return m;
}

export function resolvePartnerIdFromPartnerName(
  partnerName: string | null | undefined,
  idByKey: Map<string, number>
): number | undefined {
  const raw = partnerName?.trim();
  if (!raw) return undefined;
  return idByKey.get(normPartnerLookupKey(raw));
}

export function resolvePartnerDisplayFromPartnerName(
  partnerName: string | null | undefined,
  displayByKey: Map<string, PartnerDisplay>
): PartnerDisplay | null {
  const raw = partnerName?.trim();
  if (!raw) return null;
  return displayByKey.get(normPartnerLookupKey(raw)) ?? null;
}
