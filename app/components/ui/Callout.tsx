import Link from "next/link";
import { cn } from "@/lib/utils";

type CalloutProps = {
  title?: string;
  message: string;
  linkLabel?: string;
  href?: string;
  variant?: "info" | "success" | "warning";
  className?: string;
};

const VARIANT_STYLES = {
  info:    { wrap: "border-[var(--outline-blue-soft)] bg-[var(--color-primary-blue-50)]",             icon: "text-[var(--color-primary)]" },
  success: { wrap: "border-[color:var(--status-success-fg)]/30 bg-[color:var(--status-success-bg)]", icon: "text-[var(--color-status-success)]" },
  warning: { wrap: "border-[color:var(--status-warning-fg)]/30 bg-[color:var(--status-warning-bg)]",  icon: "text-[var(--status-warning-fg)]" },
} as const;

export function Callout({ title, message, linkLabel, href, variant = "info", className }: CalloutProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5",
        styles.wrap,
        className,
      )}
    >
      <svg
        className={cn("mt-0.5 shrink-0", styles.icon)}
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 7v4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="4.5" r="0.75" fill="currentColor" />
      </svg>
      <div className="flex flex-col gap-0.5">
        {title && (
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        )}
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
        {linkLabel && href && (
          <Link href={href} className="link-default font-medium">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
