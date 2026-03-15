CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT,
  "requestId" TEXT,
  "route" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "tokensTotal" INTEGER NOT NULL,
  "tokensPrompt" INTEGER,
  "tokensCompletion" INTEGER,
  "tokensEstimated" INTEGER,
  "overageMode" BOOLEAN NOT NULL DEFAULT false,
  "billedAmount" INTEGER,
  "billedCurrency" TEXT,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripeInvoiceItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_usage_events_workspaceId_createdAt_idx" ON "ai_usage_events"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_usage_events_overageMode_createdAt_idx" ON "ai_usage_events"("overageMode", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_usage_events_stripeSubscriptionId_idx" ON "ai_usage_events"("stripeSubscriptionId");

ALTER TABLE "ai_usage_events"
ADD CONSTRAINT "ai_usage_events_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_events"
ADD CONSTRAINT "ai_usage_events_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
