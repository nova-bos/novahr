-- Migration: hr_outputs_phase6 (Phase 6 HR outputs)
-- Additive and backward-compatible. No existing table or column is dropped,
-- renamed, or retyped. All new columns are nullable or have safe defaults.

-- Employee: termination date and reason (additive).
ALTER TABLE "Employee" ADD COLUMN "terminatedAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "terminationReason" TEXT;

-- Tenant: opt-in birthday calendar display (off by default).
ALTER TABLE "Tenant" ADD COLUMN "showBirthdaysOnCalendar" BOOLEAN NOT NULL DEFAULT false;

-- DisciplinaryRecord: formal disciplinary and counselling records per employee.
CREATE TABLE "DisciplinaryRecord" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "employeeId"  TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "issuedAt"    TIMESTAMP(3) NOT NULL,
    "expiresAt"   TIMESTAMP(3),
    "createdBy"   TEXT NOT NULL,
    "documentId"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisciplinaryRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DisciplinaryRecord_tenantId_idx" ON "DisciplinaryRecord"("tenantId");
CREATE INDEX "DisciplinaryRecord_tenantId_employeeId_idx" ON "DisciplinaryRecord"("tenantId", "employeeId");
ALTER TABLE "DisciplinaryRecord"
    ADD CONSTRAINT "DisciplinaryRecord_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryRecord"
    ADD CONSTRAINT "DisciplinaryRecord_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Announcement: company-wide announcements and policy documents.
CREATE TABLE "Announcement" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "audience"    TEXT NOT NULL DEFAULT 'all',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdBy"   TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Announcement_tenantId_idx" ON "Announcement"("tenantId");
ALTER TABLE "Announcement"
    ADD CONSTRAINT "Announcement_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
