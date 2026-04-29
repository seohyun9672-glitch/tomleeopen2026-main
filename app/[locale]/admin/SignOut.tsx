"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";

export function AdminSignOut() {
  const { t } = useLocale();
  return (
    <Button variant="secondary" type="button" onClick={() => signOut()}>
      {t.shared.buttons.signOut}
    </Button>
  );
}
