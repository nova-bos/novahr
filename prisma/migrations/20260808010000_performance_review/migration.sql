-- PerformanceReview: per-employee review within a named cycle. Additive; no
-- existing data depends on this table.
CREATE TABLE IF NOT EXISTS "PerformanceReview" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "employeeId"     TEXT NOT NULL,
    "cycle"          TEXT NOT NULL,
    "reviewDate"     TIMESTAMP(3) NOT NULL,
    "rating"         INTEGER NOT NULL,
    "strengths"      TEXT,
    "improvements"   TEXT,
    "goals"          TEXT,
    "reviewer"       TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'draft',
    "acknowledgedAt" TIMESTAMP(3),
    "createdBy"      TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PerformanceReview_tenantId_idx" ON "PerformanceReview"("tenantId");
CREATE INDEX IF NOT EXISTS "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");
ALTER TABLE "PerformanceReview"
    ADD CONSTRAINT "PerformanceReview_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceReview"
    ADD CONSTRAINT "PerformanceReview_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
