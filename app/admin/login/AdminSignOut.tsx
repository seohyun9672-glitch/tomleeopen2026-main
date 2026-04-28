"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";

export function AdminSignOut() {
  const { t } = useLocale();
  return (
    <Button
      type="button"
      variant="transparent"
      size="small"
      className="min-w-0"
      onClick={() => void signOut()}
    >
      {t.shared.buttons.signOut}
    </Button>
  );
}
