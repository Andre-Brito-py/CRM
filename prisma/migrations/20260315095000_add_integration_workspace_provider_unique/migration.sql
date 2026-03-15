-- CreateIndex
DO $$
BEGIN
  IF to_regclass('public.integrations') IS NOT NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "workspaceId_provider" ON "integrations"("workspaceId", "provider")';
  END IF;
END $$;
