import { readFileSync } from "fs";
import path from "path";
import type { Locale } from "@/lib/content";
import { getCategories } from "@/lib/category/categories";
import { getMedia } from "@/lib/media";
import { siteContent } from "@/lib/content";
import { PageContainer } from "@/app/components/PageContainer";
import { MediaHub } from "@/app/media/MediaHub";

type Props = { params: Promise<{ locale: string }> };

function loadGalleryManifest(year: number): Record<string, string[]> {
  try {
    const filePath = path.join(process.cwd(), `public/media/photos/${year}/gallery-manifest.json`);
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export default async function MediaPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const [categories, items] = await Promise.all([getCategories(), getMedia()]);

  const photoManifests: Record<number, Record<string, string[]>> = {
    2025: loadGalleryManifest(2025),
    2024: loadGalleryManifest(2024),
  };

  return (
    <PageContainer title={content.mediaPage.heroTitle}>
      <MediaHub
        items={items}
        categories={categories}
        photoManifests={photoManifests}
      />
    </PageContainer>
  );
}
