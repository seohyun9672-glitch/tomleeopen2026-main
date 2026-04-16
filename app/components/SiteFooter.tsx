"use client";

import { memo } from "react";
import Link from "next/link";
import { contactData } from "@/lib/contactData";
import { useLocale } from "@/lib/locale-context";
import { IconButton } from "@/app/components/ui/Button";

export const SiteFooter = memo(function SiteFooter() {
  const { locale } = useLocale();
  const socialLinks = [contactData.instagram, contactData.youtube, contactData.kakao];
  return (
    <footer className="mt-auto w-full border-t border-[color:var(--color-border-on-brand)] bg-[var(--footer-bg)]">
      <div className="mx-auto flex h-16 w-full max-w-[var(--container-max-w)] items-center justify-between gap-[var(--section-gap)] px-[var(--page-inline-padding)]">
        <Link href={locale === "ko" ? "/ko" : "/"} className="site-logo" aria-label="Tomlee Open — Home">
          <img src="/logo.svg" alt="Tomlee Open" className="site-logo__img" />
        </Link>
        <div className="flex items-center gap-[var(--content-gap)]">
          {socialLinks.map(({ key, href, label, src }) => (
            <IconButton
              key={key}
              aria-label={label}
              title={label}
              className="border-2 border-[var(--primary)] bg-[var(--button-secondary-fill)] text-[var(--button-secondary-text)] hover:bg-[var(--button-secondary-hover-bg)] focus-visible:ring-[var(--primary)] focus-visible:ring-offset-[var(--footer-bg)]"
              onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
            >
              <img src={src} alt="" width={20} height={20} className="h-5 w-5 object-contain" decoding="async" />
            </IconButton>
          ))}
        </div>
      </div>
    </footer>
  );
});