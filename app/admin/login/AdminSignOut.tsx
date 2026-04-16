"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/app/components/ui/Button";

export function AdminSignOut({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="transparent"
      size="small"
      className="min-w-0"
      onClick={() => void signOut()}
    >
      {label}
    </Button>
  );
}
