-- Stamp when payroll settings are first explicitly saved.
-- Used by the getting-started card to tick "Configure payroll settings".
ALTER TABLE "PayrollSettings" ADD COLUMN "payrollConfiguredAt" TIMESTAMP(3);
