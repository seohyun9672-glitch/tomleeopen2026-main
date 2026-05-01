"use client";

import { useState } from "react";
import {
  CATEGORY_YEAR_STATUSES,
  type CategoryYearStatus,
  type CategoryYearListItem,
  type CategoryRecord,
  categoryYearStatusLabel,
  categoryLabelForId,
  buildCategoryByIdMap,
} from "@/lib/category/categories";
import type { RegistrationRow } from "@/app/tables/RegistrationsTable";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import { useLocale } from "@/lib/locale-context";

type Props = {
  category: CategoryYearListItem;
  categories: CategoryRecord[];
  locale: "en" | "ko";
  registrations: RegistrationRow[];
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (status: CategoryYearStatus) => Promise<void>;
};

export function CategoryStatusModal({
  category,
  categories,
  locale,
  registrations,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const { t } = useLocale();
  const [status, setStatus] = useState<CategoryYearStatus>(category.status);

  const categoryLabel = categoryLabelForId(
    buildCategoryByIdMap(categories),
    category.categoryId,
    locale
  );

  return (
    <Modal
      onClose={onClose}
      title={categoryLabel}
      ariaLabelledBy="category-status-modal-title"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? t.adminPlayers.saving : t.adminPlayers.save,
        onClick: () => onSave(status),
        type: "button",
        disabled: saving,
      }}
      secondaryAction={{
        label: t.adminPlayers.cancel,
        onClick: onClose,
        type: "button",
        disabled: saving,
      }}
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
            {error}
          </div>
        )}
        <Field
          label={t.shared.labels.status}
          variant="select"
          id="category-status-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as CategoryYearStatus)}
        >
          {(Object.keys(CATEGORY_YEAR_STATUSES) as CategoryYearStatus[]).map((s) => (
            <option key={s} value={s}>
              {categoryYearStatusLabel(s, locale)}
            </option>
          ))}
        </Field>
        {registrations.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
              {t.shared.labels.players} ({registrations.length})
            </p>
            <ul className="space-y-1">
              {registrations.map((r) => {
                const name =
                  locale === "ko" && r.fullNameKo?.trim()
                    ? r.fullNameKo.trim()
                    : r.fullNameEn;
                return (
                  <li key={r.id} className="text-sm text-[var(--color-text-primary)]">
                    {name}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
