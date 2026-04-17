"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  getCategoryLabel,
} from "@/lib/categories/labels";
import type { CategoryRecord } from "@/lib/categories/types";
import {
  CATEGORY_YEAR_STATUSES,
  type CategoryYearListItem,
  type CategoryYearStatus,
} from "@/lib/categories/yearStatus";
import { useLocale } from "@/lib/locale-context";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import { Label } from "@/app/components/ui/Label";
import type { RegistrationRow } from "@/app/tables/RegistrationsTable";

type Props = {
  category: CategoryYearListItem;
  categories: CategoryRecord[];
  locale: "en" | "ko";
  registrations: RegistrationRow[];
  saving: boolean;
  onClose: () => void;
  onSave: (nextStatus: CategoryYearStatus) => Promise<void> | void;
};

function resolvePartnerNameForCategory(params: {
  reg: RegistrationRow;
  activeCategoryId: string;
  categories: CategoryRecord[];
  locale: "en" | "ko";
}): string {
  const { reg, activeCategoryId, categories, locale } = params;

  let partnerNameFromMap = "";
  if (reg.partnerNames) {
    try {
      const parsed = JSON.parse(reg.partnerNames) as Record<string, string>;
      const byId = parsed[activeCategoryId]?.trim();
      const byLabel = parsed[getCategoryLabel(categories, activeCategoryId)]?.trim();
      partnerNameFromMap = byId || byLabel || "";
    } catch {
      partnerNameFromMap = "";
    }
  }

  const partnerNameFromRow =
    reg.category === activeCategoryId
      ? locale === "ko" && reg.partnerNameKo?.trim()
        ? reg.partnerNameKo.trim()
        : reg.partnerNameEn?.trim() || ""
      : "";

  return partnerNameFromMap || partnerNameFromRow || "—";
}

export function CategoryStatusModal({
  category,
  categories,
  locale,
  registrations,
  saving,
  onClose,
  onSave,
}: Props) {
  const { t } = useLocale();
  const [pendingStatus, setPendingStatus] = useState<CategoryYearStatus>(category.status);

  useEffect(() => {
    setPendingStatus(category.status);
  }, [category.status]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);
  const categoryLabel = categoryLabelForId(categoriesById, category.categoryId, locale);

  const activeCategoryIsDoubles = useMemo(
    () => categoriesById.get(category.categoryId)?.isDoubles ?? false,
    [categoriesById, category.categoryId]
  );

  return (
    <Modal
      onClose={onClose}
      title={t.adminCategoryYears.tableCategory}
      ariaLabelledBy="category-status-modal-title"
      secondaryAction={{
        label: t.adminPlayers.cancel,
        onClick: onClose,
        type: "button",
        disabled: saving,
      }}
      primaryAction={{
        label: saving ? t.adminPlayers.saving : t.adminPlayers.save,
        onClick: () => onSave(pendingStatus),
        type: "button",
        disabled: saving || pendingStatus === category.status,
      }}
    >
      <div className="space-y-6">
        <section className="space-y-1">
          <p className="m-0 text-sm text-[var(--color-text-secondary)]">
            {categoryLabel}
          </p>
        </section>

        <section className="w-full space-y-2 md:w-1/2">
          <Label htmlFor={`category-status-${category.categoryId}`}>
            {t.adminCategoryYears.tableStatus}
          </Label>
          <Field
            variant="select"
            id={`category-status-${category.categoryId}`}
            value={pendingStatus}
            disabled={saving}
            onChange={(e) => setPendingStatus(e.target.value as CategoryYearStatus)}
            aria-label={t.adminCategoryYears.tableStatus}
          >
            {CATEGORY_YEAR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "Active"
                  ? t.adminCategoryYears.statusActive
                  : status === "Inactive"
                    ? t.adminCategoryYears.statusInactive
                    : t.adminCategoryYears.statusPending}
              </option>
            ))}
          </Field>
        </section>

        <section className="flex flex-col gap-[var(--content-gap)]">
          <h3 className="text-h3 m-0 text-[var(--section-text)]">
            {t.adminCategoryYears.tablePlayers}
          </h3>

          {registrations.length === 0 ? (
            <p className="m-0 text-sm text-[var(--color-text-secondary)]">—</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              {registrations.map((reg) => {
                const registrantName =
                  locale === "ko" && reg.fullNameKo?.trim()
                    ? reg.fullNameKo.trim()
                    : reg.fullNameEn;

                const partnerName = resolvePartnerNameForCategory({
                  reg,
                  activeCategoryId: category.categoryId,
                  categories,
                  locale,
                });

                const displayName = activeCategoryIsDoubles
                  ? `${registrantName} / ${partnerName}`
                  : registrantName;

                return (
                  <li key={reg.id} className="text-[var(--color-text-primary)]">
                    {displayName}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Modal>
  );
}