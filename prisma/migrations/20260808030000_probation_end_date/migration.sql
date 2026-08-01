-- Optional probation end date on Employee. Additive nullable column; existing
-- rows are NULL (no probation tracked) and behave exactly as before.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "probationEndDate" TIMESTAMP(3);
