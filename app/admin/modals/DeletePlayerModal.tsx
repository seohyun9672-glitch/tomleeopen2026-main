"use client";

import { Modal } from "@/app/components/ui/Modal";
import { useLocale } from "@/lib/locale-context";

import type { PlayerTableRow } from "../tables/PlayersTable";

export function DeletePlayerModal({
  player,
  onClose,
  onConfirm,
  saving,
}: {
  player: PlayerTableRow;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();

  return (
    <Modal
      onClose={onClose}
      title={t.adminPlayers.deleteTitle}
      ariaLabelledBy="delete-player-modal-title"
      maxWidthClassName="w-full max-w-sm"
      primaryAction={{
        label: saving ? t.adminPlayers.deleting : t.adminPlayers.delete,
        onClick: onConfirm,
        type: "button",
        disabled: saving,
      }}
    >
      <p className="text-sm leading-snug text-[var(--color-text-secondary)]">
        {player.fullNameEn} ({t.adminPlayers.idLabel} {player.id}) {t.adminPlayers.deleteWarning}
      </p>
    </Modal>
  );
}
