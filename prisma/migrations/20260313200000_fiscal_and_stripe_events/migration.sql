DO $$
BEGIN
  CREATE TYPE "StripeEventStatus" AS ENUM ('received', 'processed', 'failed', 'duplicate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FiscalProvider" AS ENUM ('focusnfe');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FiscalDocumentType" AS ENUM ('nfse');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FiscalDocumentStatus" AS ENUM ('pending', 'submitted', 'authorized', 'cancelled', 'error', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "stripeCreatedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" "StripeEventStatus" NOT NULL DEFAULT 'received',
  "requestId" TEXT,
  "dataObjectId" TEXT,
  "dataObjectType" TEXT,
  "error" TEXT,

  CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stripe_events_livemode_type_receivedAt_idx" ON "stripe_events"("livemode", "type", "receivedAt");

CREATE TABLE IF NOT EXISTS "fiscal_issuers" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpjPrestador" TEXT NOT NULL,
  "inscricaoMunicipalPrestador" TEXT,
  "codigoMunicipioEmissora" INTEGER NOT NULL,
  "codigoMunicipioPrestacao" INTEGER,
  "codigoOpcaoSimplesNacional" INTEGER,
  "regimeEspecialTributacao" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fiscal_issuers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_issuers_code_key" ON "fiscal_issuers"("code");

CREATE TABLE IF NOT EXISTS "fiscal_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "issuerId" TEXT,
  "documentType" TEXT NOT NULL,
  "document" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "cep" TEXT,
  "uf" TEXT,
  "codigoMunicipio" INTEGER,
  "logradouro" TEXT,
  "numero" TEXT,
  "complemento" TEXT,
  "bairro" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fiscal_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_profiles_userId_key" ON "fiscal_profiles"("userId");
CREATE INDEX IF NOT EXISTS "fiscal_profiles_issuerId_idx" ON "fiscal_profiles"("issuerId");

ALTER TABLE "fiscal_profiles"
ADD CONSTRAINT "fiscal_profiles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fiscal_profiles"
ADD CONSTRAINT "fiscal_profiles_issuerId_fkey"
FOREIGN KEY ("issuerId") REFERENCES "fiscal_issuers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "fiscal_documents" (
  "id" TEXT NOT NULL,
  "type" "FiscalDocumentType" NOT NULL DEFAULT 'nfse',
  "provider" "FiscalProvider" NOT NULL DEFAULT 'focusnfe',
  "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'pending',
  "reference" TEXT NOT NULL,
  "stripeInvoiceId" TEXT,
  "stripeCustomerId" TEXT,
  "userId" TEXT,
  "fiscalProfileId" TEXT,
  "issuerId" TEXT,
  "amount" DECIMAL(10,2),
  "currency" TEXT,
  "issuedAt" TIMESTAMP(3),
  "providerStatus" TEXT,
  "providerDocumentId" TEXT,
  "providerUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_documents_reference_key" ON "fiscal_documents"("reference");
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_documents_stripeInvoiceId_key" ON "fiscal_documents"("stripeInvoiceId");
CREATE INDEX IF NOT EXISTS "fiscal_documents_status_createdAt_idx" ON "fiscal_documents"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "fiscal_documents_stripeCustomerId_idx" ON "fiscal_documents"("stripeCustomerId");

ALTER TABLE "fiscal_documents"
ADD CONSTRAINT "fiscal_documents_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fiscal_documents"
ADD CONSTRAINT "fiscal_documents_fiscalProfileId_fkey"
FOREIGN KEY ("fiscalProfileId") REFERENCES "fiscal_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fiscal_documents"
ADD CONSTRAINT "fiscal_documents_issuerId_fkey"
FOREIGN KEY ("issuerId") REFERENCES "fiscal_issuers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
