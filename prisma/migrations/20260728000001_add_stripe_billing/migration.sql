-- Rename TenantPlan enum values: hr -> starter, hr_payroll -> scale, add growth
-- Postgres requires creating a new enum type and migrating the column.

-- Step 1: Add a new temporary column with text type
ALTER TABLE "Tenant" ADD COLUMN "plan_new" TEXT;

-- Step 2: Copy existing values, mapping old plan names to new ones
UPDATE "Tenant" SET "plan_new" = CASE
  WHEN "plan" = 'trial' THEN 'trial'
  WHEN "plan" = 'hr' THEN 'starter'
  WHEN "plan" = 'hr_payroll' THEN 'scale'
  ELSE 'trial'
END;

-- Step 3: Drop the old enum type usage by dropping the column (after backup)
ALTER TABLE "Tenant" DROP COLUMN "plan";

-- Step 4: Drop old enum type
DROP TYPE "TenantPlan";

-- Step 5: Create new enum type
CREATE TYPE "TenantPlan" AS ENUM ('trial', 'starter', 'growth', 'scale');

-- Step 6: Add plan column back with new enum
ALTER TABLE "Tenant" ADD COLUMN "plan" "TenantPlan" NOT NULL DEFAULT 'trial';

-- Step 7: Restore values from temporary column
UPDATE "Tenant" SET "plan" = "plan_new"::"TenantPlan";

-- Step 8: Drop temp column
ALTER TABLE "Tenant" DROP COLUMN "plan_new";

-- Step 9: Add Stripe billing fields
ALTER TABLE "Tenant" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
