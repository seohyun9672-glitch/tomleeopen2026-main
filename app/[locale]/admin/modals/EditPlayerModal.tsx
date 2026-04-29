"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { Label } from "@/app/components/ui/Label";
import { useLocale } from "@/lib/locale-context";
import type { PlayerTableRow } from "@/app/tables/PlayersTable";

type Props = {
  player: PlayerTableRow;
  onClose: () => void;
  onRequestDelete: () => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setError: (v: string) => void;
};

export function EditPlayerModal({
  player,
  onClose,
  onRequestDelete,
  onSaved,
  saving,
  setSaving,
  setError,
}: Props) {
  const { t } = useLocale();
  const ap = t.adminPlayers;

  const [fullNameEn, setFullNameEn] = useState(player.fullNameEn);
  const [fullNameKo, setFullNameKo] = useState(player.fullNameKo ?? "");
  const [email, setEmail] = useState(player.email ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [ntrp, setNtrp] = useState(player.ntrp ?? "");
  const [clubs, setClubs] = useState(player.clubs.join(", "));

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameEn: fullNameEn.trim(),
          fullNameKo: fullNameKo.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          ntrp: ntrp.trim() || null,
          clubs: clubs
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Save failed");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={ap.editTitle}
      ariaLabelledBy="edit-player-modal-title"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? ap.saving : ap.save,
        onClick: handleSave,
        type: "button",
        disabled: saving,
      }}
      secondaryAction={{
        label: ap.deleteEllipsis,
        onClick: onRequestDelete,
        type: "button",
        disabled: saving,
        variant: "destructiveOutline",
      }}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-player-name-en">{ap.nameEn}</Label>
          <Input
            id="edit-player-name-en"
            type="text"
            value={fullNameEn}
            onChange={(e) => setFullNameEn(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-player-name-ko">{ap.nameKo}</Label>
          <Input
            id="edit-player-name-ko"
            type="text"
            value={fullNameKo}
            onChange={(e) => setFullNameKo(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-player-email">{ap.email}</Label>
          <Input
            id="edit-player-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-player-phone">{ap.phone}</Label>
          <Input
            id="edit-player-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-player-ntrp">{ap.ntrp}</Label>
          <Input
            id="edit-player-ntrp"
            type="text"
            value={ntrp}
            onChange={(e) => setNtrp(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-player-clubs">{ap.clubs}</Label>
          <Input
            id="edit-player-clubs"
            type="text"
            value={clubs}
            onChange={(e) => setClubs(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
