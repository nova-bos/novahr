-- Explicit lock on a completed payroll run. Additive nullable columns; existing
-- runs are unlocked (NULL) and behave exactly as before.
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
