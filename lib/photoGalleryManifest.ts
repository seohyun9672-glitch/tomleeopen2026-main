import fs from "fs";
import path from "path";

export type PhotoGalleryManifest = Record<string, string[]>;

/** Keys are tournament years as strings (`"2024"`, `"2025"`) for safe client serialization. */
export type PhotoGalleriesByYear = Record<string, PhotoGalleryManifest>;

let cached: PhotoGalleriesByYear | null = null;

const MANIFEST_YEARS_DESC = ["2025", "2024"] as const;

/** Category id (e.g. MD-G) → public URLs under `/media/photos/{year}/…`. Server-only. */
export function readPhotoGalleriesByYearManifest(): PhotoGalleriesByYear {
  if (cached) return cached;
  const out: PhotoGalleriesByYear = {};
  for (const year of MANIFEST_YEARS_DESC) {
    const file = path.join(process.cwd(), "public", "media", "photos", year, "gallery-manifest.json");
    if (fs.existsSync(file)) {
      out[year] = JSON.parse(fs.readFileSync(file, "utf8")) as PhotoGalleryManifest;
    } else {
      out[year] = {};
    }
  }
  cached = out;
  return out;
}
