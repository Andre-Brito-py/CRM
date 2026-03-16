-- CreateTable
CREATE TABLE IF NOT EXISTS "emailVerificationTokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailVerificationTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "emailVerificationTokens_token_key" ON "emailVerificationTokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_userId_idx" ON "emailVerificationTokens"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_email_idx" ON "emailVerificationTokens"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_expires_idx" ON "emailVerificationTokens"("expires");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "emailVerificationTokens"
  ADD CONSTRAINT "emailVerificationTokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
