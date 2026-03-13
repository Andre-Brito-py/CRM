CREATE INDEX "RateLimitCounter_resetAt_idx" ON "rate_limit_counters"("resetAt");
CREATE INDEX "Member_workspaceId_status_deletedAt_idx" ON "members"("workspaceId", "status", "deletedAt");
CREATE INDEX "Integration_workspaceId_provider_enabled_idx" ON "integrations"("workspaceId", "provider", "enabled");
CREATE INDEX "Conversation_workspaceId_platform_deletedAt_idx" ON "conversations"("workspaceId", "platform", "deletedAt");
CREATE INDEX "AutomationRule_workspaceId_isActive_deletedAt_idx" ON "automation_rules"("workspaceId", "isActive", "deletedAt");
CREATE INDEX "Webhook_workspaceId_isActive_deletedAt_idx" ON "webhooks"("workspaceId", "isActive", "deletedAt");
CREATE INDEX "Message_conversationId_direction_createdAt_idx" ON "messages"("conversationId", "direction", "createdAt");
