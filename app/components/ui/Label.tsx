"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  value: string | null | undefined;
  className?: string;
  truncate?: boolean;
};

export function Label({ icon, value, className, truncate }: Props) {
  if (!value) return null;
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      {icon}
      <span className={truncate ? "min-w-0 truncate" : undefined}>{value}</span>
    </span>
  );
}
