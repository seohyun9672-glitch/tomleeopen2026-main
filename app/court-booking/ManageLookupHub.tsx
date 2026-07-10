"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { PageContainer } from "@/app/components/PageContainer";
import { BackButton } from "@/app/components/ui/BackButton";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { getYear } from "@/lib/utils";

export function ManageLookupHub() {
  const { t } = useLocale();
  const cb = t.courtBookingPage;
  const year = getYear();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/registrations/lookup?email=${encodeURIComponent(trimmed)}&year=${year}`
      );
      if (res.status === 404) { setError(cb.lookup.noResult); return; }
      if (!res.ok) { setError(cb.lookup.error); return; }
      setEmail("");
      router.push(`/court-booking/manage?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setError(cb.lookup.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer
      title={cb.manageHeroTitle}
      beforeTitle={<BackButton onClick={() => router.push("/court-booking")} />}
      contentMaxWidth="max-w-[var(--form-max-width)]"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{cb.cancel.emailDescription}</p>
        <Field
          variant="email"
          id="manage-email"
          label={cb.lookup.emailLabel}
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") handleSubmit(); }}
          wrapperClassName="w-full"
        />
        {error && <p className="text-sm text-[var(--color-status-error)]">{error}</p>}
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
        >
          {loading ? cb.lookup.loading : cb.cancel.searchButton}
        </Button>
      </div>
    </PageContainer>
  );
}
