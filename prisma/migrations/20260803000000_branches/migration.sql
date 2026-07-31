-- Migration: branches (Phase 5a)
-- Additive and backward-compatible only. Adds one new table (Branch) and three
-- nullable columns (Employee.branchId, PayrollRun.branchId, User.branchScopeId).
-- No existing table or column is dropped, renamed, or retyped, and there is no
-- data backfill: a tenant with zero branches behaves exactly as before, because
-- every new branch column defaults to NULL ("whole company / head office").

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Employee: optional branch assignment. Null keeps every existing employee in
-- the whole-company scope.
ALTER TABLE "Employee" ADD COLUMN "branchId" TEXT;

-- PayrollRun: optional branch this run targets. Null keeps every existing run
-- covering the whole company.
ALTER TABLE "PayrollRun" ADD COLUMN "branchId" TEXT;

-- User: optional branch scope for admins. Null keeps full company access.
ALTER TABLE "User" ADD COLUMN "branchScopeId" TEXT;
