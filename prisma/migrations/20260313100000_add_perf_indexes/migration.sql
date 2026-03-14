CREATE INDEX IF NOT EXISTS "conversations_workspaceId_updatedAt_idx"
ON "conversations" ("workspaceId", "updatedAt");

CREATE INDEX IF NOT EXISTS "deals_stageId_deletedAt_createdAt_idx"
ON "deals" ("stageId", "deletedAt", "createdAt");

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "tasks_workspaceId_deletedAt_createdAt_idx" ON "tasks" ("workspaceId", "deletedAt", "createdAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.webhook_deliveries') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_nextRetryAt_attempts_idx" ON "webhook_deliveries" ("status", "nextRetryAt", "attempts")';
  END IF;
END $$;
