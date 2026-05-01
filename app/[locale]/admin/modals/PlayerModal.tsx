"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { PlayerForm, type PlayerFormValues } from "@/app/components/PlayerForm";
import { useLocale } from "@/lib/locale-context";
import type { PlayerTableRow } from "@/app/tables/PlayersTable";

type EditProps = {
  mode: "edit";
  player: PlayerTableRow;
  onRequestDelete: () => void;
};

type AddProps = {
  mode: "add";
  player?: undefined;
  onRequestDelete?: undefined;
};

type Props = (EditProps | AddProps) & {
  onClose: () => void;
  onSaved: () => void;
};

export function PlayerModal({ mode, player, onClose, onRequestDelete, onSaved }: Props) {
  const { t } = useLocale();
  const ap = t.adminPlayers;

  const [values, setValues] = useState<PlayerFormValues>({
    fullNameEn: player?.fullNameEn ?? "",
    fullNameKo: player?.fullNameKo ?? "",
    email: player?.email ?? "",
    phone: player?.phone ?? "",
    ntrp: player?.ntrp ?? "",
    clubs: player?.clubs ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/admin/players/${player.id}` : "/api/players";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameEn: values.fullNameEn.trim(),
          fullNameKo: values.fullNameKo.trim() || null,
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          ntrp: values.ntrp.trim() || null,
          clubs: values.clubs,
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
      title={mode === "edit" ? ap.editTitle : ap.addTitle}
      ariaLabelledBy="player-modal-title"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? ap.saving : ap.save,
        onClick: handleSave,
        type: "button",
        disabled: saving,
      }}
      {...(mode === "edit" && {
        secondaryAction: {
          label: ap.deleteEllipsis,
          onClick: onRequestDelete,
          type: "button" as const,
          disabled: saving,
          variant: "destructiveOutline" as const,
        },
      })}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      )}
      <PlayerForm values={values} onChange={(u) => setValues((prev) => ({ ...prev, ...u }))} />
    </Modal>
  );
}
