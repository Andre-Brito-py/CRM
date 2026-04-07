-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "quotedMessageId" TEXT;

-- AlterTable
ALTER TABLE "payment_products" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "annualDiscount" DOUBLE PRECISION,
ADD COLUMN     "cancellationFeePercentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "priceAnnual" DOUBLE PRECISION,
ADD COLUMN     "stripePriceIdAnnual" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "extraAiTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extraWaMessages" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountAnnual" DOUBLE PRECISION,
    "stripePriceId" TEXT,
    "stripePriceIdAnnual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_errors" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB DEFAULT '{}',
    "level" TEXT NOT NULL DEFAULT 'error',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_usage_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "messageId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "provider" TEXT NOT NULL DEFAULT 'whatsapp',
    "overageMode" BOOLEAN NOT NULL DEFAULT false,
    "billedAmount" INTEGER,
    "billedCurrency" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeInvoiceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "subject" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_prices_planId_idx" ON "plan_prices"("planId");

-- CreateIndex
CREATE INDEX "system_errors_level_createdAt_idx" ON "system_errors"("level", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_usage_events_workspaceId_createdAt_idx" ON "whatsapp_usage_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_usage_events_workspaceId_direction_createdAt_idx" ON "whatsapp_usage_events"("workspaceId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_usage_events_overageMode_createdAt_idx" ON "whatsapp_usage_events"("overageMode", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_usage_events_stripeSubscriptionId_idx" ON "whatsapp_usage_events"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "support_tickets_workspaceId_status_deletedAt_idx" ON "support_tickets"("workspaceId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "support_tickets_createdById_status_idx" ON "support_tickets"("createdById", "status");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_usage_events" ADD CONSTRAINT "whatsapp_usage_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_usage_events" ADD CONSTRAINT "whatsapp_usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
