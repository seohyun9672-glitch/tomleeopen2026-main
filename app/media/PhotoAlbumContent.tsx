"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import type { CommunityMediaPostRecord } from "@/lib/communityMedia";
import type { Messages } from "@/lib/content";

const cardGridClass =
  "grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 sm:gap-[var(--grid-gap-md)] md:grid-cols-3 lg:grid-cols-4";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LIKED_IDS_STORAGE_KEY = "communityMediaLikedPostIds";
const VIEWED_IDS_STORAGE_KEY = "communityMediaViewedPostIds";

function HeartIcon({ filled, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={3} y={5} width={18} height={14} rx={2} />
      <circle cx={9} cy={10} r={1.5} />
      <path d="M21 16l-5.5-5.5L9 17" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={12} y1={5} x2={12} y2={19} />
      <line x1={5} y1={12} x2={19} y2={12} />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  );
}

function formatDate(d: Date | string, locale: "en" | "ko"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-CA", {
    year: "numeric",
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
  });
}

function readIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

// ─── Like control (shared by card + detail modal) ──────────────────────────

function LikeControl({
  count,
  liked,
  onLike,
  ariaLabel,
  size = "sm",
}: {
  count: number;
  liked: boolean;
  onLike: () => void;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const iconSize = size === "md" ? 22 : 18;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onLike();
      }}
      aria-label={ariaLabel}
      aria-pressed={liked}
      className={"inline-flex items-center gap-1" + (size === "md" ? " text-base" : " text-sm")}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center text-[var(--status-error-fg,#e11d48)]"
        style={{ width: iconSize, height: iconSize }}
      >
        <HeartIcon filled={liked} size={iconSize} />
      </span>
      <span className="tabular-nums text-[var(--color-text-primary)]">{count}</span>
    </button>
  );
}

function ViewControl({ count, size = "sm", ariaLabel }: { count: number; size?: "sm" | "md"; ariaLabel: string }) {
  const iconSize = size === "md" ? 22 : 18;
  return (
    <span
      aria-label={ariaLabel}
      className={"inline-flex items-center gap-1 text-[var(--color-text-primary)]" + (size === "md" ? " text-base" : " text-sm")}
    >
      <span className="inline-flex shrink-0 items-center justify-center text-[var(--color-text-secondary)]" style={{ width: iconSize, height: iconSize }}>
        <EyeIcon size={iconSize} />
      </span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

// ─── Upload form modal ──────────────────────────────────────────────────────

export function UploadPhotoModal({
  open,
  onClose,
  onUploaded,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  t: Messages["mediaPage"]["photoAlbum"];
}) {
  const [nickname, setNickname] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setNickname("");
    setCaption("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(t.invalidType);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(t.tooLarge);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleClearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !nickname.trim() || !caption.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("nickname", nickname.trim());
      formData.append("title", caption.trim());
      const res = await fetch("/api/community-media", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload failed");
      onUploaded();
      handleClose();
    } catch {
      setSubmitting(false);
      setError(t.uploadError);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t.uploadModalTitle} maxWidthClass="max-w-lg">
      <form id="upload-photo-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="upload-photo-file" className="block mb-1.5 text-sm font-medium [color:var(--section-text)]">
            {t.fields.photo}
            <span className="text-[var(--form-required-mark)]"> *</span>
          </label>
          <input
            ref={fileInputRef}
            id="upload-photo-file"
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            required
            onChange={handleFileChange}
            className="sr-only"
          />
          {previewUrl ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="aspect-video w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={handleClearFile}
                aria-label={t.removePhoto}
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-surface-card)_85%,transparent)] text-[var(--color-text-primary)] shadow-sm ring-1 ring-[color:var(--color-border-ui)]"
              >
                <XIcon />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--color-border-ui)] px-6 py-10 text-center">
              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon /> {t.chooseButton}
              </Button>
            </div>
          )}
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{t.photoHelp}</p>
        </div>
        <Field
          variant="text"
          id="upload-photo-caption"
          label={t.fields.caption}
          required
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <Field
          variant="text"
          id="upload-photo-nickname"
          label={t.fields.nickname}
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {error && <p className="form-field-error">{error}</p>}
      </form>
      <div className="mt-4">
        <Button
          size="medium"
          type="submit"
          form="upload-photo-form"
          disabled={submitting || !file || !nickname.trim() || !caption.trim()}
          className="w-full"
        >
          {submitting ? t.submitting : t.submit}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Detail modal (photo) ───────────────────────────────────────────────────

function PhotoDetailModal({
  post,
  onClose,
  liked,
  onLike,
  locale,
  t,
}: {
  post: CommunityMediaPostRecord;
  onClose: () => void;
  liked: boolean;
  onLike: (id: string) => void;
  locale: "en" | "ko";
  t: Messages["mediaPage"]["photoAlbum"];
}) {
  return (
    <Modal open onClose={onClose} title={t.detailModalTitle} maxWidthClass="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg object-cover" />
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-h3 m-0 min-w-0">{post.title}</h3>
          <div className="flex shrink-0 items-center gap-3">
            <LikeControl count={post.likeCount} liked={liked} onLike={() => onLike(post.id)} ariaLabel={t.likeLabel} size="md" />
            <ViewControl count={post.viewCount} size="md" ariaLabel={t.viewsLabel} />
          </div>
        </div>
        <p className="m-0 -mt-2 text-sm text-[var(--color-text-secondary)]">
          {t.by} {post.nickname} · {formatDate(post.createdAt, locale)}
        </p>
      </div>
    </Modal>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ t, onUpload }: { t: Messages["mediaPage"]["photoAlbum"]; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--color-border-ui)] px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-[var(--color-text-tertiary)]">
        <ImagePlaceholderIcon />
      </div>
      <p className="m-0 text-[var(--section-text)]">{t.emptyState}</p>
      <Button
        variant="transparent"
        size="medium"
        onClick={onUpload}
        className="!text-[var(--color-primary-blue)] hover:!bg-[color-mix(in_srgb,var(--color-primary-blue)_12%,transparent)] hover:!text-[var(--color-primary-blue)]"
      >
        <PlusIcon /> {t.uploadButton}
      </Button>
    </div>
  );
}

// ─── Main content ───────────────────────────────────────────────────────────

export function PhotoAlbumContent({
  posts,
  locale,
  t,
  uploadOpen,
  onUploadOpenChange,
}: {
  posts: CommunityMediaPostRecord[];
  locale: "en" | "ko";
  t: Messages["mediaPage"]["photoAlbum"];
  uploadOpen: boolean;
  onUploadOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [localPosts, setLocalPosts] = useState(posts);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => setLocalPosts(posts), [posts]);
  useEffect(() => {
    setLikedIds(readIdSet(LIKED_IDS_STORAGE_KEY));
    setViewedIds(readIdSet(VIEWED_IDS_STORAGE_KEY));
  }, []);

  async function handleLike(id: string) {
    const alreadyLiked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(id);
      else next.add(id);
      writeIdSet(LIKED_IDS_STORAGE_KEY, next);
      return next;
    });
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likeCount: Math.max(0, p.likeCount + (alreadyLiked ? -1 : 1)) } : p)),
    );
    try {
      await fetch(`/api/community-media/${id}/like`, { method: alreadyLiked ? "DELETE" : "POST" });
    } catch {
      // best-effort; server refresh will reconcile
    }
  }

  async function handleView(id: string) {
    if (viewedIds.has(id)) return;
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeIdSet(VIEWED_IDS_STORAGE_KEY, next);
      return next;
    });
    setLocalPosts((prev) => prev.map((p) => (p.id === id ? { ...p, viewCount: p.viewCount + 1 } : p)));
    try {
      await fetch(`/api/community-media/${id}/view`, { method: "POST" });
    } catch {
      // best-effort; server refresh will reconcile
    }
  }

  const detailPost = detailId ? localPosts.find((p) => p.id === detailId) ?? null : null;

  return (
    <div className="flex flex-col gap-[var(--grid-gap)] md:gap-[var(--grid-gap-md)]">
      {localPosts.length === 0 ? (
        <EmptyState t={t} onUpload={() => onUploadOpenChange(true)} />
      ) : (
        <>
          <div className="flex justify-start">
            <Button
              variant="transparent"
              size="small"
              onClick={() => onUploadOpenChange(true)}
              className="!text-[var(--color-primary-blue)] hover:!bg-[color-mix(in_srgb,var(--color-primary-blue)_12%,transparent)] hover:!text-[var(--color-primary-blue)]"
            >
              <PlusIcon /> {t.uploadButton}
            </Button>
          </div>
          <ul className={cardGridClass}>
          {localPosts.map((post) => (
            <li key={post.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setDetailId(post.id);
                  handleView(post.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailId(post.id);
                    handleView(post.id);
                  }
                }}
                className="cursor-pointer"
              >
              <Card
                variant="media"
                image={post.imageUrl}
                imageAlt={post.title}
                title={post.title}
                subtext={`${t.by} ${post.nickname} · ${formatDate(post.createdAt, locale)}`}
                cornerAction={
                  <div className="flex items-center gap-3">
                    <LikeControl
                      count={post.likeCount}
                      liked={likedIds.has(post.id)}
                      onLike={() => handleLike(post.id)}
                      ariaLabel={t.likeLabel}
                    />
                    <ViewControl count={post.viewCount} ariaLabel={t.viewsLabel} />
                  </div>
                }
              />
              </div>
            </li>
          ))}
          </ul>
        </>
      )}

      <UploadPhotoModal
        open={uploadOpen}
        onClose={() => onUploadOpenChange(false)}
        onUploaded={() => router.refresh()}
        t={t}
      />

      {detailPost && (
        <PhotoDetailModal
          post={detailPost}
          onClose={() => setDetailId(null)}
          liked={likedIds.has(detailPost.id)}
          onLike={handleLike}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}
