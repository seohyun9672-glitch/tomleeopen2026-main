/**
 * Derive YouTube still URLs from watch / embed / youtu.be links.
 * @see https://developers.google.com/youtube/v3/docs/thumbnails
 */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;
      const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (embed?.[1]) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Reliable default (480×360); `maxresdefault` is often missing for older uploads. */
export function youtubeThumbnailHqUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
