-- Leave accrual method: annual leave can be earned monthly over 12 months
-- (accrual, the default) or granted in full upfront. Applies to annual leave;
-- other leave types are allocated as configured.
CREATE TYPE "LeaveAccrualMethod" AS ENUM ('upfront', 'accrual');

ALTER TABLE "TenantLeavePolicy"
  ADD COLUMN "leaveAccrualMethod" "LeaveAccrualMethod" NOT NULL DEFAULT 'accrual';
