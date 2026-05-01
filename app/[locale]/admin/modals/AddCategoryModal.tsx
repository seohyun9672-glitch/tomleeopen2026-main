"use client";

import { useState } from "react";
import {
  CATEGORY_YEAR_STATUSES,
  type CategoryYearStatus,
  type CategoryRecord,
  type CategoryYearListItem,
  categoryYearStatusLabel,
  categoryLabelForId,
  buildCategoryByIdMap,
} from "@/lib/category/categories";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import { useLocale } from "@/lib/locale-context";

type Props = {
  categories: CategoryRecord[];
  year: number;
  existingItems: CategoryYearListItem[];
  onClose: () => void;
  onSaved: () => void;
};

export function AddCategoryModal({ categories, year, existingItems, onClose, onSaved }: Props) {
  const { locale, t } = useLocale();
  const cy = t.categoryYears;
  const ap = t.adminPlayers;

  const existingIds = new Set(existingItems.map((i) => i.categoryId));
  const available = categories.filter((c) => !existingIds.has(c.id));

  const categoriesById = buildCategoryByIdMap(categories);

  const [categoryId, setCategoryId] = useState(available[0]?.id ?? "");
  const [status, setStatus] = useState<CategoryYearStatus>("Pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!categoryId) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/category-years", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentYear: year, categoryId, status }),
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
      title={cy.addModalTitle}
      ariaLabelledBy="add-category-modal-title"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? ap.saving : ap.save,
        onClick: handleSave,
        type: "button",
        disabled: saving || !categoryId,
      }}
      secondaryAction={{
        label: ap.cancel,
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
        {available.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            All categories are already added for {year}.
          </p>
        ) : (
          <>
            <Field
              label={t.shared.labels.category}
              variant="select"
              id="add-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabelForId(categoriesById, c.id, locale)}
                </option>
              ))}
            </Field>
            <Field
              label={t.shared.labels.status}
              variant="select"
              id="add-category-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CategoryYearStatus)}
            >
              {(Object.keys(CATEGORY_YEAR_STATUSES) as CategoryYearStatus[]).map((s) => (
                <option key={s} value={s}>
                  {categoryYearStatusLabel(s, locale)}
                </option>
              ))}
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
