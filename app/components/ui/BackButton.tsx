"use client";

import { useLocale } from "@/lib/locale-context";

type Props = { onClick: () => void };

export function BackButton({ onClick }: Props) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-[var(--color-text-secondary)] underline"
    >
      {t.shared.buttons.back}
    </button>
  );
}
