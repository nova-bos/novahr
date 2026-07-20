-- Change annualCarryover default to false and annualMaxCarryoverDays to 5.
-- Most SMEs do not offer carryover by default; it must be explicitly enabled.
-- Existing rows are not changed.
ALTER TABLE "TenantLeavePolicy" ALTER COLUMN "annualCarryover" SET DEFAULT false;
ALTER TABLE "TenantLeavePolicy" ALTER COLUMN "annualMaxCarryoverDays" SET DEFAULT 5;
