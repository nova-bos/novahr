-- Optional pay-frequency scope on a payroll run, so weekly and monthly staff
-- can be run as separate pay groups. Additive nullable column; existing runs
-- are NULL (all frequencies) and behave exactly as before.
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "payFrequency" "PayFrequency";
