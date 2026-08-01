-- Job position and cost centre catalogues, plus an optional cost-centre
-- assignment on Employee. All additive; existing data is unaffected.
CREATE TABLE IF NOT EXISTS "JobPosition" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "grade"     TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "JobPosition_tenantId_idx" ON "JobPosition"("tenantId");
ALTER TABLE "JobPosition"
    ADD CONSTRAINT "JobPosition_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CostCentre" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "code"      TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostCentre_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CostCentre_tenantId_idx" ON "CostCentre"("tenantId");
ALTER TABLE "CostCentre"
    ADD CONSTRAINT "CostCentre_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "costCentreId" TEXT;
