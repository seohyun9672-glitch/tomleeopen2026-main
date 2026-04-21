import type { Locale } from "@/lib/content";
import { getCategories } from "@/lib/categories";
import { getMedia, getPhotoGalleriesByYear } from "@/lib/media";
import { siteContent } from "@/lib/content";
import { PageContainer } from "@/app/components/PageContainer";
import { MediaHub } from "@/app/media/MediaHub";

type Props = { params: Promise<{ locale: string }> };

export default async function MediaPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const categories = await getCategories();
  const [items, photoGalleries2025, photoGalleries2024] = await Promise.all([
    getMedia(),
    getPhotoGalleriesByYear(2025, categories),
    getPhotoGalleriesByYear(2024, categories),
  ]);
  const photoGalleries = [...photoGalleries2025, ...photoGalleries2024];

  return (
    <PageContainer title={content.mediaPage.heroTitle}>
      <MediaHub
        items={items}
        categories={categories}
        photoGalleries={photoGalleries}
      />
    </PageContainer>
  );
}
