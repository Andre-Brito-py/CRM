DO $$
BEGIN
  IF to_regclass('public.rate_limit_counters') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "RateLimitCounter_resetAt_idx" ON "rate_limit_counters"("resetAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.members') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Member_workspaceId_status_deletedAt_idx" ON "members"("workspaceId", "status", "deletedAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.integrations') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Integration_workspaceId_provider_enabled_idx" ON "integrations"("workspaceId", "provider", "enabled")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Conversation_workspaceId_platform_deletedAt_idx" ON "conversations"("workspaceId", "platform", "deletedAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.automation_rules') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "AutomationRule_workspaceId_isActive_deletedAt_idx" ON "automation_rules"("workspaceId", "isActive", "deletedAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.webhooks') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Webhook_workspaceId_isActive_deletedAt_idx" ON "webhooks"("workspaceId", "isActive", "deletedAt")';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Message_conversationId_direction_createdAt_idx" ON "messages"("conversationId", "direction", "createdAt")';
  END IF;
END $$;
