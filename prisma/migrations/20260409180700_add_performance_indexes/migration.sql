-- CreateIndex
CREATE INDEX "contacts_workspaceId_deletedAt_idx" ON "contacts"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_phone_idx" ON "contacts"("workspaceId", "phone");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_deletedAt_idx" ON "conversations"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "deals_workspaceId_deletedAt_idx" ON "deals"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "users_suspended_idx" ON "users"("suspended");
