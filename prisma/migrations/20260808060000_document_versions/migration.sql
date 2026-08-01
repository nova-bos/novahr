-- Document version history. Additive columns; existing documents become
-- version 1 and current by default.
ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "previousVersionId" TEXT;
