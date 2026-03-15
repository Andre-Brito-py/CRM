-- AlterTable
DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "mediaProcessingConsentAt" TIMESTAMP(3)';
  END IF;
END $$;
