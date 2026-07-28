-- Add Paystack billing fields to Tenant.
-- Extends TenantPlan enum with the three Paystack subscription tiers.
-- Paystack does not require stripeCustomerId or stripeSubscriptionId fields
-- (those were never added), so no columns need to be dropped here.

ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'growth';
ALTER TYPE "TenantPlan" ADD VALUE IF NOT EXISTS 'scale';

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "paystackCustomerCode"     TEXT,
  ADD COLUMN IF NOT EXISTS "paystackSubscriptionCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus"       TEXT,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd"         TIMESTAMP(3);
