-- Per-tenant "employer pays during family leave" flags. Additive booleans
-- defaulting to false (the BCEA statutory position: family leave is unpaid by
-- the employer, claimable from the UIF). Existing tenants keep the statutory
-- default until they opt in.
ALTER TABLE "TenantLeavePolicy" ADD COLUMN IF NOT EXISTS "maternityPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantLeavePolicy" ADD COLUMN IF NOT EXISTS "parentalPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantLeavePolicy" ADD COLUMN IF NOT EXISTS "adoptionPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantLeavePolicy" ADD COLUMN IF NOT EXISTS "commissioningPaid" BOOLEAN NOT NULL DEFAULT false;
