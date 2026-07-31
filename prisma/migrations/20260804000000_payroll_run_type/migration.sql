-- Migration: payroll_run_type (Phase 6 HR outputs)
-- Additive and backward-compatible only. Adds two nullable columns to
-- PayrollRun: runType (classification) and runReason (free text). No existing
-- table or column is dropped, renamed, or retyped, and there is no data
-- backfill. runType defaults to 'regular' so every existing run keeps exactly
-- its current behaviour; a null runType is also treated as regular by the app.

-- PayrollRun: run classification. 'regular' = normal monthly scheduled run
-- (current behaviour), 'off_cycle' = ad-hoc bonus or correction run.
ALTER TABLE "PayrollRun" ADD COLUMN "runType" TEXT DEFAULT 'regular';

-- PayrollRun: optional free-text reason for an off-cycle run.
ALTER TABLE "PayrollRun" ADD COLUMN "runReason" TEXT;
