"use client";

type Props = {
  locale: "en" | "ko";
  onChange: (locale: "en" | "ko") => void;
  enLabel?: string;
  koLabel?: string;
  className?: string;
};

export function LocaleSelector({
  locale,
  onChange,
  enLabel = "EN",
  koLabel = "KO",
  className = "",
}: Props) {
  return (
    <div
      role="group"
      aria-label="Select language"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--color-surface-card)]/10 p-0.5 ${className}`}
    >
      {(["en", "ko"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            className={`h-7 rounded-full px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
              active
                ? "bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-on-brand)]/80 hover:text-[var(--color-text-on-brand)]"
            }`}
          >
            {code === "en" ? enLabel : koLabel}
          </button>
        );
      })}
    </div>
  );
}
