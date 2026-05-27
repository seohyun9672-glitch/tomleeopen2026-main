import Link from "next/link";
import { cn } from "@/lib/utils";

type CalloutProps = {
  title?: string;
  message: string;
  linkLabel?: string;
  href?: string;
  className?: string;
};

export function Callout({ title, message, linkLabel, href, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-[var(--outline-blue-soft)] bg-[var(--color-primary-blue-50)] px-4 py-3.5",
        className,
      )}
    >
      <svg
        className="mt-0.5 shrink-0 text-[var(--color-primary)]"
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
