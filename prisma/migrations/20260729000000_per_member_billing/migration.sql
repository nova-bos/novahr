-- Migration: per_member_billing
-- Adds the new TenantPlan enum values and migrates existing rows.
-- PostgreSQL does not allow removing enum values, so the old values
-- (hr, hr_payroll, starter, growth, scale) remain in the enum type
-- but are no longer used by the application.
--
-- Each ALTER TYPE must run in a separate transaction from the UPDATE
-- because PostgreSQL does not make new enum values visible within the
-- same transaction that added them.

ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'subscribed';
ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'enterprise';

-- Use a text cast to compare against old values that may still be in the DB.
-- New installs will have no rows to update.
UPDATE "Tenant" SET plan = 'subscribed' WHERE plan::text IN ('hr', 'hr_payroll', 'starter', 'growth', 'scale');
