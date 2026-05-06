"use client";

import type { ReactNode } from "react";
import { Button, IconButton } from "@/app/components/ui/Button";
import { cn } from "@/lib/utils";

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export type TableLayoutProps = {
  filters?: ReactNode;
  searchBar?: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
  totalCount?: ReactNode;
  empty?: boolean;
  emptyText?: string;
  className?: string;
};

export function TableLayout({
  filters,
  searchBar,
  onAdd,
  addLabel = "Add new",
  children,
  totalCount,
  empty,
  emptyText,
  className,
}: TableLayoutProps) {
  const hasHeader = filters != null || searchBar != null || onAdd != null;

  return (
    <div className={cn("flex w-full flex-col gap-[var(--content-gap)]", className)}>
      {hasHeader && (
        <div className="flex min-w-0 w-full items-end justify-end gap-2">
          {(filters != null || searchBar != null) && (
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-[var(--content-gap)]">
              {filters}
              {searchBar}
            </div>
          )}
          {onAdd != null && (
            <>
              <Button
                variant="secondary"
                size="medium"
                shape="rounded"
                onClick={onAdd}
                className="hidden shrink-0 sm:inline-flex"
              >
                {addLabel}
              </Button>
              <IconButton
                aria-label={addLabel}
                variant="secondary"
                onClick={onAdd}
                className="shrink-0 sm:hidden rounded-[var(--button-border-radius-rounded)]"
              >
                <PlusIcon />
              </IconButton>
            </>
          )}
        </div>
      )}

      {empty && emptyText ? (
        <div className="py-12 text-center text-[var(--color-text-tertiary)]">{emptyText}</div>
      ) : (
        <div className="min-w-0 w-full">{children}</div>
      )}

      {totalCount != null && (
        <div className="flex w-full justify-end">
          <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
            {totalCount}
          </p>
        </div>
      )}
    </div>
  );
}
