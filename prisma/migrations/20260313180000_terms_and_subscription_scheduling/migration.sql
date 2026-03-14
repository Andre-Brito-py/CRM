-- AlterTable
ALTER TABLE "customerPayments" ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT;
ALTER TABLE "customerPayments" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "customerPayments" ADD COLUMN IF NOT EXISTS "pendingSubscriptionType" "SubscriptionType";
ALTER TABLE "customerPayments" ADD COLUMN IF NOT EXISTS "pendingEffectiveAt" TIMESTAMP(3);
ALTER TABLE "customerPayments" ADD COLUMN IF NOT EXISTS "pendingStripePriceId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
