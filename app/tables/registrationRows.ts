import { formatNtrpDisplay } from "@/lib/ntrpFormat";

export type SerializedRawReg = {
  id: string;
  playerId: number;
  partnerId: number | null;
  tournamentYear: number;
  categoryId: string;
  status: string;
  nameOnEtransfer: string | null;
  photoVideoConsent: boolean;
  engraving: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  player: {
    id: number;
    fullNameEn: string;
    fullNameKo: string | null;
    email: string;
    phone: string | null;
    ntrp: string | null;
    clubs: string[];
  };
  partner: { fullNameEn: string; fullNameKo: string | null } | null;
};

export function buildRegistrationRows(
  rawRegs: SerializedRawReg[],
  categoryIsDoubles: Map<string, boolean>
) {
  // Deduplicate doubles pairs (show one row per pair)
  const deduped: SerializedRawReg[] = [];
  const seenPairKeys = new Set<string>();
  for (const reg of rawRegs) {
    if (!(categoryIsDoubles.get(reg.categoryId) ?? false)) {
      deduped.push(reg);
      continue;
    }
    const resolvedPartnerId = reg.partnerId ?? null;
    if (!resolvedPartnerId || resolvedPartnerId === reg.playerId) {
      deduped.push(reg);
      continue;
    }
    const a = Math.min(reg.playerId, resolvedPartnerId);
    const b = Math.max(reg.playerId, resolvedPartnerId);
    const pairKey = `${reg.tournamentYear}:${reg.categoryId}:${a}:${b}`;
    if (seenPairKeys.has(pairKey)) continue;
    seenPairKeys.add(pairKey);
    deduped.push(reg);
  }

  // Registration numbers: sorted by createdAt ascending
  const regNumberById = new Map<string, number>();
  [...rawRegs]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((r, i) => regNumberById.set(r.id, i + 1));

  // Group regs by player to show partner names across all their categories
  const regsByPlayer = new Map<number, SerializedRawReg[]>();
  for (const reg of rawRegs) {
    const list = regsByPlayer.get(reg.playerId) ?? [];
    list.push(reg);
    regsByPlayer.set(reg.playerId, list);
  }

  return deduped.map((r) => {
    const groupedRegs = regsByPlayer.get(r.playerId) ?? [r];
    const allCategoryIds = groupedRegs.map((gr) => gr.categoryId);
    const partnerNameByCategory: Record<string, string> = {};
    for (const gr of groupedRegs) {
      const linkedEn = gr.partner?.fullNameEn?.trim();
      const linkedKo = gr.partner?.fullNameKo?.trim();
      const partnerDisplay = linkedEn ?? linkedKo ?? "";
      if (partnerDisplay) partnerNameByCategory[gr.categoryId] = partnerDisplay;
    }
    const linkedEn = r.partner?.fullNameEn?.trim() ?? null;
    const linkedKo = r.partner?.fullNameKo?.trim() ?? null;
    return {
      id: r.id,
      playerId: r.playerId,
      registrationNumber: regNumberById.get(r.id) ?? null,
      tournamentYear: r.tournamentYear,
      fullNameEn: r.player.fullNameEn,
      fullNameKo: r.player.fullNameKo,
      email: r.player.email,
      phone: r.player.phone,
      ntrp: r.player.ntrp != null ? formatNtrpDisplay(r.player.ntrp) : null,
      partnerNameEn: linkedEn ?? null,
      partnerNameKo: linkedKo ?? null,
      clubs: JSON.stringify(r.player.clubs),
      category: r.categoryId,
      categories: JSON.stringify(allCategoryIds),
      partnerId: r.partnerId,
      partnerNames:
        Object.keys(partnerNameByCategory).length > 0
          ? JSON.stringify(partnerNameByCategory)
          : null,
      nameOnEtransfer: r.nameOnEtransfer,
      photoVideoConsent: r.photoVideoConsent,
      engraving: r.engraving,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}
