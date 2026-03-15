-- CreateTable
CREATE TABLE "payment_products" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_products_workspaceId_slug_key" ON "payment_products"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "payment_products_workspaceId_idx" ON "payment_products"("workspaceId");

-- CreateIndex
CREATE INDEX "payment_products_workspaceId_active_idx" ON "payment_products"("workspaceId", "active");

-- AddForeignKey
ALTER TABLE "payment_products" ADD CONSTRAINT "payment_products_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

