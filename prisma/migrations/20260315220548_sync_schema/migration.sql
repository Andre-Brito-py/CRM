-- CreateEnum
CREATE TYPE "PaymentProviderName" AS ENUM ('asaas', 'stripe', 'pagarme', 'mercadopago');

-- CreateEnum
CREATE TYPE "PaymentProviderStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "PaymentProviderEnvironment" AS ENUM ('sandbox', 'production');

-- CreateEnum
CREATE TYPE "NpsSurveyTriggerType" AS ENUM ('manual', 'deal_closed', 'scheduled');

-- CreateEnum
CREATE TYPE "NpsClassification" AS ENUM ('promoter', 'passive', 'detractor');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'PENDING');

-- DropForeignKey
ALTER TABLE "tags" DROP CONSTRAINT "tags_workspaceId_fkey";

-- DropIndex
DROP INDEX "tags_workspaceId_name_key";

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "asaasCustomerId" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "rate_limit_counters" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "color" DROP DEFAULT,
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingStatus" JSONB DEFAULT '{}',
ADD COLUMN     "password" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "aiContext" TEXT;

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "name" "PaymentProviderName" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "PaymentProviderStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_credentials" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "environment" "PaymentProviderEnvironment" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_payment_settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "platformFeePercentage" DECIMAL(5,2),
    "platformFeeFixed" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextBillingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'WhatsApp',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "providerId" TEXT,
    "providerPaymentId" TEXT,
    "asaasCustomerId" TEXT,
    "asaasPaymentId" TEXT,
    "amount" DECIMAL(10,2),
    "value" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2),
    "netAmount" DECIMAL(10,2),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "billingType" TEXT,
    "dueDate" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "paymentUrl" TEXT,
    "paymentLink" TEXT,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_surveys" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" "NpsSurveyTriggerType" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nps_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_responses" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedbackText" TEXT,
    "classification" "NpsClassification" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "actionType" TEXT NOT NULL,
    "actionConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ruleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "actionType" TEXT NOT NULL,
    "actionConfig" JSONB,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT,
    "assigneeId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "stripePriceId" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCouponId" TEXT,
    "amountOff" DOUBLE PRECISION,
    "percentOff" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "duration" TEXT NOT NULL DEFAULT 'once',
    "durationInMonths" INTEGER,
    "maxRedemptions" INTEGER,
    "timesRedeemed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "stripePromoId" TEXT,
    "maxRedemptions" INTEGER,
    "timesRedeemed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_forms" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "submitText" TEXT NOT NULL DEFAULT 'Submit',
    "successMessage" TEXT NOT NULL DEFAULT 'Thank you! Application submitted.',
    "config" JSONB NOT NULL DEFAULT '[]',
    "pipelineId" TEXT,
    "stageId" TEXT,
    "tagId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "web_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_providers_name_key" ON "payment_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_credentials_providerId_environment_key" ON "payment_provider_credentials"("providerId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_payment_settings_workspaceId_key" ON "workspace_payment_settings"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_payment_settings_providerId_idx" ON "workspace_payment_settings"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_workspaceId_key" ON "platform_subscriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "platform_subscriptions_planId_idx" ON "platform_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "platform_subscriptions_providerId_idx" ON "platform_subscriptions"("providerId");

-- CreateIndex
CREATE INDEX "integrations_workspaceId_provider_enabled_idx" ON "integrations"("workspaceId", "provider", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_workspaceId_provider_key" ON "integrations"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "payments_asaasPaymentId_key" ON "payments"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "payments_workspaceId_idx" ON "payments"("workspaceId");

-- CreateIndex
CREATE INDEX "payments_workspaceId_contactId_idx" ON "payments"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "payments_workspaceId_dealId_idx" ON "payments"("workspaceId", "dealId");

-- CreateIndex
CREATE INDEX "payments_workspaceId_status_idx" ON "payments"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "payments_workspaceId_createdAt_idx" ON "payments"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_providerId_idx" ON "payments"("providerId");

-- CreateIndex
CREATE INDEX "payments_providerId_providerPaymentId_idx" ON "payments"("providerId", "providerPaymentId");

-- CreateIndex
CREATE INDEX "nps_surveys_workspaceId_idx" ON "nps_surveys"("workspaceId");

-- CreateIndex
CREATE INDEX "nps_surveys_workspaceId_createdAt_idx" ON "nps_surveys"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "nps_responses_workspaceId_idx" ON "nps_responses"("workspaceId");

-- CreateIndex
CREATE INDEX "nps_responses_workspaceId_surveyId_idx" ON "nps_responses"("workspaceId", "surveyId");

-- CreateIndex
CREATE INDEX "nps_responses_workspaceId_contactId_idx" ON "nps_responses"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "nps_responses_workspaceId_classification_idx" ON "nps_responses"("workspaceId", "classification");

-- CreateIndex
CREATE INDEX "nps_responses_workspaceId_createdAt_idx" ON "nps_responses"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "nps_responses_surveyId_contactId_key" ON "nps_responses"("surveyId", "contactId");

-- CreateIndex
CREATE INDEX "automation_rules_workspaceId_idx" ON "automation_rules"("workspaceId");

-- CreateIndex
CREATE INDEX "automation_rules_workspaceId_isActive_deletedAt_idx" ON "automation_rules"("workspaceId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "automation_jobs_workspaceId_status_runAt_idx" ON "automation_jobs"("workspaceId", "status", "runAt");

-- CreateIndex
CREATE INDEX "message_templates_workspaceId_idx" ON "message_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "webhooks_workspaceId_isActive_deletedAt_idx" ON "webhooks"("workspaceId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookId_status_idx" ON "webhook_deliveries"("webhookId", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_nextRetryAt_attempts_idx" ON "webhook_deliveries"("status", "nextRetryAt", "attempts");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_idx" ON "tasks"("workspaceId");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_assigneeId_idx" ON "tasks"("workspaceId", "assigneeId");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_isCompleted_dueDate_idx" ON "tasks"("workspaceId", "isCompleted", "dueDate");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_deletedAt_createdAt_idx" ON "tasks"("workspaceId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_stripeCouponId_key" ON "coupons"("stripeCouponId");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_stripePromoId_key" ON "promotion_codes"("stripePromoId");

-- CreateIndex
CREATE INDEX "promotion_codes_couponId_idx" ON "promotion_codes"("couponId");

-- CreateIndex
CREATE INDEX "notifications_workspaceId_userId_idx" ON "notifications"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "web_forms_slug_key" ON "web_forms"("slug");

-- CreateIndex
CREATE INDEX "web_forms_workspaceId_idx" ON "web_forms"("workspaceId");

-- CreateIndex
CREATE INDEX "web_forms_workspaceId_slug_idx" ON "web_forms"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "activities_workspaceId_idx" ON "activities"("workspaceId");

-- CreateIndex
CREATE INDEX "activities_workspaceId_createdAt_idx" ON "activities"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_contactId_idx" ON "activities"("contactId");

-- CreateIndex
CREATE INDEX "activities_dealId_idx" ON "activities"("dealId");

-- CreateIndex
CREATE INDEX "companies_workspaceId_idx" ON "companies"("workspaceId");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_idx" ON "contacts"("workspaceId");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_createdAt_idx" ON "contacts"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_idx" ON "conversations"("workspaceId");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_status_idx" ON "conversations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_assigneeId_idx" ON "conversations"("workspaceId", "assigneeId");

-- CreateIndex
CREATE INDEX "deals_workspaceId_idx" ON "deals"("workspaceId");

-- CreateIndex
CREATE INDEX "deals_workspaceId_stageId_idx" ON "deals"("workspaceId", "stageId");

-- CreateIndex
CREATE INDEX "deals_workspaceId_createdAt_idx" ON "deals"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "deals_stageId_idx" ON "deals"("stageId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "pipelines_workspaceId_idx" ON "pipelines"("workspaceId");

-- CreateIndex
CREATE INDEX "stages_pipelineId_idx" ON "stages"("pipelineId");

-- CreateIndex
CREATE INDEX "tags_workspaceId_idx" ON "tags"("workspaceId");

-- AddForeignKey
ALTER TABLE "payment_provider_credentials" ADD CONSTRAINT "payment_provider_credentials_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "payment_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_payment_settings" ADD CONSTRAINT "workspace_payment_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_payment_settings" ADD CONSTRAINT "workspace_payment_settings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "payment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "nps_surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_forms" ADD CONSTRAINT "web_forms_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_forms" ADD CONSTRAINT "web_forms_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_forms" ADD CONSTRAINT "web_forms_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_forms" ADD CONSTRAINT "web_forms_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Conversation_workspaceId_platform_deletedAt_idx" RENAME TO "conversations_workspaceId_platform_deletedAt_idx";

-- RenameIndex
ALTER INDEX "Member_workspaceId_status_deletedAt_idx" RENAME TO "members_workspaceId_status_deletedAt_idx";

-- RenameIndex
ALTER INDEX "Message_conversationId_direction_createdAt_idx" RENAME TO "messages_conversationId_direction_createdAt_idx";

-- RenameIndex
ALTER INDEX "RateLimitCounter_resetAt_idx" RENAME TO "rate_limit_counters_resetAt_idx";
