-- Migration: CategoryPrize bracket → per-category
-- Clears bracket-level records and restructures the table.
-- After running this, execute: npx prisma db push && npx prisma db seed

BEGIN;

-- Drop existing bracket records (will be re-seeded per-category)
DELETE FROM "CategoryPrize";

-- Drop old unique constraint
ALTER TABLE "CategoryPrize"
  DROP CONSTRAINT IF EXISTS "CategoryPrize_tournamentYear_isDoubles_teamCountBracket_key";

-- Drop old columns
ALTER TABLE "CategoryPrize"
  DROP COLUMN IF EXISTS "isDoubles",
  DROP COLUMN IF EXISTS "teamCountBracket";

-- Add new column
ALTER TABLE "CategoryPrize"
  ADD COLUMN "categoryId" TEXT NOT NULL DEFAULT '';

-- Remove the temporary default
ALTER TABLE "CategoryPrize"
  ALTER COLUMN "categoryId" DROP DEFAULT;

-- Add FK to Category
ALTER TABLE "CategoryPrize"
  ADD CONSTRAINT "CategoryPrize_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE;

-- Add new unique constraint
ALTER TABLE "CategoryPrize"
  ADD CONSTRAINT "CategoryPrize_tournamentYear_categoryId_key"
  UNIQUE ("tournamentYear", "categoryId");

-- Update index (drop old, recreate)
DROP INDEX IF EXISTS "CategoryPrize_tournamentYear_idx";
CREATE INDEX "CategoryPrize_tournamentYear_idx" ON "CategoryPrize" ("tournamentYear");

COMMIT;
