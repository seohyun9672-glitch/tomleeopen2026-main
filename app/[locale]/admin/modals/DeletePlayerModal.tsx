"use client";

import { Modal } from "@/app/components/ui/Modal";
import { useLocale } from "@/lib/locale-context";
import type { PlayerTableRow } from "@/app/tables/PlayersTable";

type Props = {
  player: PlayerTableRow;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  error?: string;
};

export function DeletePlayerModal({ player: _player, onClose, onConfirm, saving, error }: Props) {
  const { t } = useLocale();
  const ap = t.adminPlayers;

  return (
    <Modal
      onClose={onClose}
      title={ap.deleteTitle}
      ariaLabelledBy="delete-player-modal-title"
      maxWidthClassName="w-full max-w-sm"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? ap.deleting : ap.delete,
        onClick: onConfirm,
        type: "button",
        disabled: saving,
        variant: "destructiveOutline",
      }}
      secondaryAction={{
        label: ap.cancel,
        onClick: onClose,
        type: "button",
        disabled: saving,
      }}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      )}
      <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{ap.deleteWarning}</p>
    </Modal>
  );
}
