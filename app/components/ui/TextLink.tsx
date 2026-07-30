import Link from "next/link";
import { cn } from "@/lib/utils";

type TextLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Plain inline text link, blue by default. Use for "View all" / secondary nav links next to section titles. */
export function TextLink({ href, className, children }: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-[var(--color-primary-blue)] transition-colors duration-150 hover:text-[var(--color-primary-blue-700)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
