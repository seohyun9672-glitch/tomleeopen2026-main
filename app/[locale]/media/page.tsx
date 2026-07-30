import { readFileSync } from "fs";
import path from "path";
import { getCategories } from "@/lib/categories";
import { getMedia } from "@/lib/media";
import { getCommunityMediaPosts } from "@/lib/communityMedia";
import { PageContainer } from "@/app/components/PageContainer";
import { MediaHub } from "@/app/media/MediaHub";

function loadGalleryManifest(year: number): Record<string, string[]> {
  try {
    const filePath = path.join(process.cwd(), `public/media/photos/${year}/gallery-manifest.json`);
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export default async function MediaPage() {
  const [categories, items, communityMediaPosts] = await Promise.all([
    getCategories(),
    getMedia(),
    getCommunityMediaPosts(),
  ]);

  const photoManifests: Record<number, Record<string, string[]>> = {
    2025: loadGalleryManifest(2025),
    2024: loadGalleryManifest(2024),
  };

  return (
    <PageContainer>
      <MediaHub
        items={items}
        categories={categories}
        photoManifests={photoManifests}
        communityMediaPosts={communityMediaPosts}
      />
    </PageContainer>
  );
}
