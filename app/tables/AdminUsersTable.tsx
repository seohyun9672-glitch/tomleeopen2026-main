"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import { Chip } from "@/app/components/ui/Chip";
import { TableLayout } from "@/app/components/layout/TableLayout";

export type AdminUser = { id: string; email: string; active: boolean; createdAt: string };

type Props = {
  rows: AdminUser[];
  onCountChange?: (n: number) => void;
};

export function AdminUsersTable({ rows, onCountChange }: Props) {
  const { t } = useLocale();
  const au = t.adminPage.users;
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // edit form state
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    onCountChange?.(rows.length);
  }, [rows.length, onCountChange]);

  function openEdit(user: AdminUser) {
    setEditEmail(user.email);
    setEditActive(user.active);
    setEditingUser(user);
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: editActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? au.saveFailed);
        return;
      }
      setEditingUser(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: AdminUser) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? au.saveFailed);
        return;
      }
      setDeletingUser(null);
      setEditingUser(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? au.saveFailed);
        return;
      }
      setAddOpen(false);
      setNewEmail("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TableLayout onAdd={() => setAddOpen(true)} addLabel={au.addTitle} totalCount={au.total(rows.length)}>
        <Table
          variant="data"
          headers={[au.email, au.createdOn, au.status]}
          dataRows={rows.map((u) => [
            u.email,
            u.createdAt.slice(0, 10),
            <Chip
              key={`${u.id}-status`}
              label={u.active ? au.active : au.inactive}
              className={
                u.active
                  ? "border-0 bg-[var(--chip-status-success-bg)] text-[var(--chip-status-success-fg)]"
                  : "border-0 bg-[var(--chip-status-error-bg)] text-[var(--chip-status-error-fg)]"
              }
            />,
          ])}
          onRowClick={(_, rowIndex) => openEdit(rows[rowIndex]!)}
        />
      </TableLayout>

      {/* Edit admin modal */}
      {editingUser && (
        <Modal
          onClose={() => setEditingUser(null)}
          title={editingUser.email}
          ariaLabelledBy="edit-admin-modal-title"
          primaryAction={{
            label: saving ? au.deleting : t.adminPlayers.save,
            onClick: handleSaveEdit,
            type: "button",
            disabled: saving,
          }}
          secondaryAction={{
            label: au.delete,
            onClick: () => setDeletingUser(editingUser),
            type: "button",
            disabled: saving,
            variant: "destructiveOutline",
          }}
        >
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Field label={au.email} variant="email" id="edit-admin-email" value={editEmail} disabled />
            <Field
              label={au.status}
              variant="select"
              id="edit-admin-status"
              value={editActive ? "active" : "inactive"}
              onChange={(e) => setEditActive(e.target.value === "active")}
            >
              <option value="active">{au.active}</option>
              <option value="inactive">{au.inactive}</option>
            </Field>
          </div>
        </Modal>
      )}

      {/* Add admin modal */}
      {addOpen && (
        <Modal
          onClose={() => { setAddOpen(false); setNewEmail(""); setError(""); }}
          title={au.addTitle}
          ariaLabelledBy="add-admin-modal-title"
          primaryAction={{
            label: saving ? au.deleting : au.addTitle,
            onClick: handleAdd,
            type: "button",
            disabled: saving,
          }}
        >
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Field
              label={au.email}
              variant="email"
              id="add-admin-email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
            />
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deletingUser && (
        <Modal
          onClose={() => setDeletingUser(null)}
          title={au.deleteTitle}
          ariaLabelledBy="delete-admin-modal-title"
          maxWidthClassName="w-full max-w-sm"
          primaryAction={{
            label: saving ? au.deleting : au.delete,
            onClick: () => handleDelete(deletingUser),
            type: "button",
            disabled: saving,
            variant: "destructiveOutline",
          }}
        >
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
              {error}
            </div>
          )}
          <p className="text-sm leading-snug text-[var(--color-text-secondary)]">
            {au.deleteWarning}
          </p>
        </Modal>
      )}
    </>
  );
}
