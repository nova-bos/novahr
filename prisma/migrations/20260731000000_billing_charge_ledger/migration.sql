-- Migration: billing_charge_ledger
-- Additive only: introduces the BillingCharge ledger table plus its indexes
-- and foreign key. No existing tables or columns are altered or dropped.

-- CreateTable
CREATE TABLE "BillingCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "chargeType" TEXT NOT NULL,
    "paystackChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingCharge_reference_key" ON "BillingCharge"("reference");

-- CreateIndex
CREATE INDEX "BillingCharge_tenantId_idx" ON "BillingCharge"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCharge_tenantId_period_key" ON "BillingCharge"("tenantId", "period");

-- AddForeignKey
ALTER TABLE "BillingCharge" ADD CONSTRAINT "BillingCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
