"use client";

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FilterGroup } from "@/app/components/layout/FilterGroup";
import { CategoryFilter } from "@/app/components/FilterControls";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  categoryChipClass,
  getCategoryLabel,
  getCategoryId,
} from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";
import { type Locale } from "@/lib/content";
import { RegistrationForm, type RegistrationFormHandle } from "@/app/registration/RegistrationForm";
import { prefetchRegistrationFormData } from "@/lib/registration";
import { matchStatusChipClass } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";
import {
  TableDataChip,
  TableDataChipGroup,
  TableCellIconCenter,
  TableStackedPlayersCell,
  TableTechnicalIdCell,
} from "@/app/components/ui/table/tableCells";
import { Modal } from "@/app/components/ui/Modal";
import { isCategoryConfirmedInYearMap, type CategoryYearStatus } from "@/lib/categories";

export type RegistrationRow = {
  id: string;
  playerId: number | null;
  registrationNumber: number | null;
  tournamentYear: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  category: string;
  categories: string | null;
  ntrp: string | null;
  clubs: string | null;
  nameOnEtransfer: string | null;
  partnerNameEn: string | null;
  partnerNameKo: string | null;
  partnerId: number | null;
  partnerNames: string | null;
  photoVideoConsent: boolean;
  engraving: string | null;
  notes: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function getLinkedPartnerDisplay(
  partnerNameEn: string | null,
  partnerNameKo: string | null,
  locale: Locale
): string {
  if (locale === "ko" && partnerNameKo?.trim()) return partnerNameKo.trim();
  if (partnerNameEn?.trim()) return partnerNameEn.trim();
  if (partnerNameKo?.trim()) return partnerNameKo.trim();
  return "";
}

function formatPartnerNames(
  categoryById: Map<string, CategoryRecord>,
  categoryRecords: CategoryRecord[],
  partnerNames: string | null,
  partnerNameEn: string | null,
  partnerNameKo: string | null,
  categoryIds: string[],
  locale: Locale
): { text: string; hasMultiplePartners: boolean } {
  const linked = getLinkedPartnerDisplay(partnerNameEn, partnerNameKo, locale);

  if (partnerNames) {
    try {
      const obj = JSON.parse(partnerNames) as Record<string, string>;
      const entries = categoryIds.reduce<{ category: string; name: string }[]>((acc, c) => {
        const name =
          obj[c]?.trim() ??
          obj[getCategoryId(categoryRecords, c)]?.trim() ??
          obj[getCategoryLabel(categoryRecords, c)]?.trim() ??
          linked;
        if (name) acc.push({ category: categoryLabelForId(categoryById, c, locale), name });
        return acc;
      }, []);

      if (entries.length > 0) {
        const hasMultiple = entries.length > 1;
        return {
          text: hasMultiple ? entries.map((e) => `${e.category}: ${e.name}`).join("; ") : entries[0].name,
          hasMultiplePartners: hasMultiple,
        };
      }
    } catch {
      //
    }
  }

  return { text: linked || "", hasMultiplePartners: false };
}

function parseClubs(clubs: string | null): string[] {
  if (!clubs) return [];
  try {
    const a = JSON.parse(clubs);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function parseRegistrationCategories(
  categories: string | null,
  fallbackCategory: string
): string[] {
  if (categories) {
    try {
      const a = JSON.parse(categories);
      if (Array.isArray(a) && a.length > 0) return a.filter((c): c is string => typeof c === "string");
    } catch {
      //
    }
  }
  return fallbackCategory ? [fallbackCategory] : [];
}

export function registrationRowToRegistrationPageInitial(
  reg: RegistrationRow,
  categoryRecords: CategoryRecord[],
  locale: Locale
) {
  const cats = parseRegistrationCategories(reg.categories, reg.category).map((c) =>
    getCategoryId(categoryRecords, c)
  );
  const byId = buildCategoryByIdMap(categoryRecords);
  const isDoubles = (id: string) => byId.get(id)?.isDoubles ?? false;
  const partnerNames: Record<string, string> = {};

  if (reg.partnerNames) {
    try {
      const obj = JSON.parse(reg.partnerNames) as Record<string, string>;
      cats.filter(isDoubles).forEach((catId) => {
        const name = obj[catId] ?? obj[getCategoryLabel(categoryRecords, catId)] ?? "";
        if (name) partnerNames[catId] = name;
      });
    } catch {
      //
    }
  }

  const partnerEn = reg.partnerNameEn?.trim();
  const partnerKo = reg.partnerNameKo?.trim();
  if (partnerEn || partnerKo) {
    const forForm = locale === "ko" && partnerKo ? partnerKo : (partnerEn ?? partnerKo ?? "");
    if (forForm) {
      const currentCategoryId = getCategoryId(categoryRecords, reg.category);
      if (currentCategoryId && isDoubles(currentCategoryId)) {
        partnerNames[currentCategoryId] = forForm;
      }
    }
  }

  const rawEngraving = (reg.engraving ?? "").trim();
  const legacyRequested = rawEngraving.toLowerCase() === "requested";

  return {
    selectedPlayerId: reg.playerId != null ? String(reg.playerId) : null,
    fullNameEn: reg.fullNameEn,
    fullNameKo: reg.fullNameKo ?? "",
    email: reg.email,
    phone: reg.phone ?? "",
    ntrp: reg.ntrp ?? "",
    clubs: parseClubs(reg.clubs),
    categories: cats,
    partnerNames,
    photoVideoConsent: reg.photoVideoConsent,
    engravingWanted: !!rawEngraving,
    engravingText: rawEngraving && !legacyRequested ? rawEngraving.slice(0, 25) : "",
    nameOnEtransfer: reg.nameOnEtransfer ?? "",
    etransferSent: /e-transfer/i.test(reg.notes ?? ""),
  };
}

type DerivedRow = {
  raw: RegistrationRow;
  displayName: string;
  partnerDisplay: { text: string; hasMultiplePartners: boolean };
  status: "Pending" | "Confirmed" | "Cancelled" | "Refund Requested" | "Refunded";
  cats: [string];
};

type RegistrationsTableProps = {
  initial: RegistrationRow[];
  categories: CategoryRecord[];
  year: number;
  totalCount?: number;
  categoryStatusById: Record<string, CategoryYearStatus>;
  /** When set with {@link onCategoryFilterChange}, category filter UI is omitted (parent renders it). */
  categoryFilter?: string;
  onCategoryFilterChange?: (value: string) => void;
};

type RegSortKey = "regNumber" | "name" | "partner" | "category" | "status" | "media" | "engraving";

export function RegistrationsTable({
  initial,
  categories,
  year,
  totalCount,
  categoryStatusById,
  categoryFilter: categoryFilterProp,
  onCategoryFilterChange,
}: RegistrationsTableProps) {
  const { locale, t } = useLocale();
  const adminReg = t.adminRegistrations;
  const router = useRouter();

  const categoryFilterControlled = onCategoryFilterChange != null;
  const [internalCategoryFilter, setInternalCategoryFilter] = useState("");
  const categoryFilter = categoryFilterControlled ? (categoryFilterProp ?? "") : internalCategoryFilter;
  const setCategoryFilter = categoryFilterControlled ? onCategoryFilterChange! : setInternalCategoryFilter;
  const [editing, setEditing] = useState<RegistrationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<RegSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoryOptions = useMemo(() => {
    const ids = [...new Set(initial.map((r) => r.category).filter(Boolean))].filter((id) =>
      isCategoryConfirmedInYearMap(id, categoryStatusById)
    );
    return ids
      .map((id) => ({ id, label: categoryLabelForId(categoriesById, id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [initial, categoriesById, locale, categoryStatusById]);

  const editFormRef = useRef<RegistrationFormHandle>(null);

  // Pre-warm registration form data cache so edit modal opens instantly
  useEffect(() => { prefetchRegistrationFormData(); }, []);

  const showConsentAndEngraving = year > 2025;

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
    setCategoryFilter("");
  }, [year, showConsentAndEngraving, setCategoryFilter]);

  const derivedRows = useMemo<DerivedRow[]>(
    () =>
      initial.map((r) => ({
        raw: r,
        displayName: locale === "ko" && r.fullNameKo?.trim() ? r.fullNameKo.trim() : r.fullNameEn,
        partnerDisplay: formatPartnerNames(
          categoriesById,
          categories,
          r.partnerNames,
          r.partnerNameEn,
          r.partnerNameKo,
          [r.category],
          locale
        ),
        // Registration's own terminal/confirmed statuses take precedence.
        // Pending registrations fall back to derived status from the category-year state.
        status: (
          r.status === "Confirmed" || r.status === "Refund Requested" || r.status === "Cancelled" || r.status === "Refunded"
            ? r.status
            : categoryStatusById[r.category] === "Active"
              ? "Confirmed"
              : categoryStatusById[r.category] === "Inactive"
                ? "Cancelled"
                : "Pending"
        ) as DerivedRow["status"],
        cats: [r.category] as [string],
      })),
    [initial, categories, categoriesById, locale, categoryStatusById]
  );

  const sortedRows = useMemo<DerivedRow[]>(() => {
    if (!sortKey) return derivedRows;
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number) => (a - b) * dir;

    return [...derivedRows].sort((a, b) => {
      switch (sortKey) {
        case "regNumber":
          return cmpNum(a.raw.registrationNumber ?? 1e9, b.raw.registrationNumber ?? 1e9);
        case "name":
          return cmpStr(a.raw.fullNameEn.trim(), b.raw.fullNameEn.trim());
        case "category":
          return cmpStr(a.raw.category ?? "", b.raw.category ?? "");
        case "partner":
          return cmpStr(a.partnerDisplay.text, b.partnerDisplay.text);
        case "status":
          return cmpStr(a.status, b.status);
        case "media":
          return cmpNum(a.raw.photoVideoConsent ? 1 : 0, b.raw.photoVideoConsent ? 1 : 0);
        case "engraving":
          return cmpStr((a.raw.engraving ?? "").trim(), (b.raw.engraving ?? "").trim());
        default:
          return 0;
      }
    });
  }, [derivedRows, sortKey, sortDir]);

  const filteredSortedRows = useMemo(
    () => (categoryFilter ? sortedRows.filter((r) => r.raw.category === categoryFilter) : sortedRows),
    [sortedRows, categoryFilter]
  );

  const handleRegSort = useCallback((key: string) => {
    const k = key as RegSortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setError("");
      setSaving(true);
      try {
        const res = await fetch(`/api/registrations/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Delete failed");
          return;
        }
        setDeletingId(null);
        router.refresh();
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  const handleCloseEditing = useCallback(() => setEditing(null), []);
  const handleEditSuccess = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const handleRequestDelete = useCallback(() => {
    setEditing((prev) => {
      if (prev) setDeletingId(prev.id);
      return null;
    });
  }, []);

  const handleCancelDelete = useCallback(() => setDeletingId(null), []);

  const statusMeta = useCallback(
    (status: string): { label: string; chipClass: string } => {
      if (status === "Confirmed") return { label: t.adminRegistrationStatus.confirmed, chipClass: matchStatusChipClass("Completed") };
      if (status === "Cancelled") return { label: t.adminRegistrationStatus.cancelled, chipClass: matchStatusChipClass("Cancelled") };
      if (status === "Refund Requested") return { label: t.adminRegistrationStatus.refundRequested, chipClass: matchStatusChipClass("Cancelled") };
      if (status === "Refunded") return { label: t.adminRegistrationStatus.refunded, chipClass: matchStatusChipClass("Pending") };
      return { label: t.adminCategoryYears.statusPending, chipClass: matchStatusChipClass("Pending") };
    },
    [t.adminCategoryYears, t.adminRegistrationStatus]
  );

  if (initial.length === 0) {
    return (
      <div className="p-12 text-center text-[var(--color-text-tertiary)]">No registrations yet.</div>
    );
  }

  const totalCountResolved = totalCount ?? initial.length;
  const headers = showConsentAndEngraving
    ? [adminReg.tableRegNumber, adminReg.tableName, adminReg.tablePartner, adminReg.tableCategory, adminReg.tableStatus, adminReg.tableMediaConsent, adminReg.tableEngraving]
    : [adminReg.tableRegNumber, adminReg.tableName, adminReg.tablePartner, adminReg.tableCategory, adminReg.tableStatus];
  const sortKeys = showConsentAndEngraving
    ? (["regNumber", "name", "partner", "category", "status", "media", "engraving"] as RegSortKey[])
    : (["regNumber", "name", "partner", "category", "status"] as RegSortKey[]);

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      )}

      {!categoryFilterControlled && categoryOptions.length > 1 ? (
        <FilterGroup>
          <CategoryFilter
            id="registrations-category"
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
            allLabel={t.shared.labels.allCategories}
          />
        </FilterGroup>
      ) : null}

      <div className="flex flex-col w-full min-w-0">
        <Table
          variant="data"
          headers={headers}
          sortConfig={{
            activeKey: sortKey,
            direction: sortDir,
            keys: sortKeys,
            onSort: handleRegSort,
          }}
          dataRows={filteredSortedRows.map(({ raw: r, displayName, partnerDisplay, status, cats }) => {
            const { label: statusLabel, chipClass: statusChipClass } = statusMeta(status);

            const baseCells: (string | ReactNode)[] = [
              <TableTechnicalIdCell key={`${r.id}-regnum`}>
                {r.registrationNumber != null ? String(r.registrationNumber) : "—"}
              </TableTechnicalIdCell>,
              <span key={`${r.id}-name`} title={r.id}>
                {displayName}
              </span>,
              <span
                key={`${r.id}-partner`}
                title={partnerDisplay.hasMultiplePartners ? "Partner per category (multiple doubles)" : undefined}
              >
                <TableStackedPlayersCell text={partnerDisplay.text || undefined} splitSemicolons />
              </span>,
              <TableDataChipGroup key={`${r.id}-cats`}>
                {cats.map((c) => (
                  <TableDataChip key={c} className={categoryChipClass(c)} label={categoryLabelForId(categoriesById, c, locale)} title={c} />
                ))}
              </TableDataChipGroup>,
              <TableDataChipGroup key={`${r.id}-status-group`}>
                <TableDataChip key={`${r.id}-${cats[0]}-status`} className={statusChipClass} label={statusLabel} />
              </TableDataChipGroup>,
            ];

            if (showConsentAndEngraving) {
              baseCells.push(
                <TableCellIconCenter key={`${r.id}-media`}>
                  <span
                    className="inline-flex"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={r.photoVideoConsent}
                      readOnly
                      aria-label={`Media consent for ${r.fullNameEn}`}
                    />
                  </span>
                </TableCellIconCenter>,
                r.engraving?.trim() ? r.engraving : "—"
              );
            }

            return baseCells;
          })}
          onRowClick={(_, rowIndex) => {
            const row = filteredSortedRows[rowIndex];
            if (row) setEditing(row.raw);
          }}
        />
        <div className="mt-2 flex w-full justify-end">
          <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
            {adminReg.totalCount(filteredSortedRows.length)}
          </p>
        </div>
      </div>

      {editing && (
        <Modal
          onClose={handleCloseEditing}
          title={adminReg.editModalTitle}
          ariaLabelledBy="edit-registration-modal-title"
          secondaryAction={{
            label: adminReg.deleteEllipsis,
            onClick: handleRequestDelete,
            type: "button",
            disabled: isEditingSubmitting,
          }}
          primaryAction={{
            label: "Save",
            onClick: () => editFormRef.current?.submit(),
            type: "button",
            disabled: isEditingSubmitting,
          }}
        >
          <RegistrationForm
            ref={editFormRef}
            key={editing.id}
            mode="adminEdit"
            registrationId={editing.id}
            initialFormState={registrationRowToRegistrationPageInitial(editing, categories, locale)}
            initialStatus={editing.status}
            onClose={handleCloseEditing}
            onSuccess={handleEditSuccess}
            onLoadingChange={setIsEditingSubmitting}
          />
        </Modal>
      )}

      {deletingId && (
        <Modal
          onClose={handleCancelDelete}
          title={adminReg.deleteModalTitle}
          ariaLabelledBy="delete-registration-modal-title"
          maxWidthClassName="w-full max-w-sm"
          primaryAction={{
            label: saving ? adminReg.deleteModalDeleting : adminReg.deleteRegistration,
            onClick: () => handleDelete(deletingId),
            type: "button",
            disabled: saving,
          }}
        >
          <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{adminReg.deleteModalBody}</p>
        </Modal>
      )}
    </>
  );
}