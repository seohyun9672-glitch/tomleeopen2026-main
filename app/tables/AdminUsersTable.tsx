"use client";

import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";

type AdminUser = { id: string; email: string; createdAt: string };

type Props = { rows: AdminUser[] };

export function AdminUsersTable({ rows }: Props) {
  const { t } = useLocale();
  const au = t.adminPage.users;

  return (
    <div className="flex w-full flex-col">
      <Table
        variant="data"
        headers={[au.email, au.createdOn]}
        dataRows={rows.map((u) => [u.email, u.createdAt.slice(0, 10)])}
      />
      <div className="mt-2 flex w-full justify-end">
        <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
          {au.total(rows.length)}
        </p>
      </div>
    </div>
  );
}
