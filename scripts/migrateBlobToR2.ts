import "dotenv/config";
import { prisma } from "../lib/prisma";
import { uploadToR2 } from "../lib/r2";

/**
 * One-off migration: copies existing Vercel Blob-hosted community media images
 * to R2 and updates the stored imageUrl. Run once Blob quota access returns.
 */
async function main() {
  const posts = await prisma.communityMediaPost.findMany({
    where: { imageUrl: { contains: "public.blob.vercel-storage.com" } },
    select: { id: true, imageUrl: true },
  });

  console.log(`Found ${posts.length} post(s) still on Vercel Blob.`);

  for (const post of posts) {
    try {
      const res = await fetch(post.imageUrl);
      if (!res.ok) {
        console.error(`  [${post.id}] fetch failed: ${res.status}`);
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      const extension = contentType.split("/")[1] ?? "jpg";
      const arrayBuffer = await res.arrayBuffer();
      const file = new File([arrayBuffer], `${post.id}.${extension}`, { type: contentType });

      const newUrl = await uploadToR2(`community-media/${crypto.randomUUID()}.${extension}`, file);
      await prisma.communityMediaPost.update({ where: { id: post.id }, data: { imageUrl: newUrl } });
      console.log(`  [${post.id}] migrated -> ${newUrl}`);
    } catch (e) {
      console.error(`  [${post.id}] error:`, e);
    }
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
