-- Enable Row-Level Security on all tenant-scoped tables.
--
-- FORCE ROW LEVEL SECURITY means the policy applies even to the postgres
-- superuser role used by Prisma. The policy allows access when:
--   1. app.tenant_id is not set (NULL) or is an empty string — covers seed
--      scripts, admin tooling, and migrations that run without tenant context.
--   2. app.tenant_id matches the row's tenantId — covers all server actions
--      that wrap their queries in runAsTenant().
--
-- Tenant and User are cross-tenant lookup tables that the application reads
-- without a tenant context (e.g. loading auth state, sending emails). They
-- get ENABLE only (no FORCE, no policies) which blocks REST API access from
-- the anon/authenticated roles while leaving the postgres role unrestricted.

-- ── Tenant-scoped tables ────────────────────────────────────────────────────

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Employee"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "LeaveBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveBalance" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "LeaveBalance"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "employeeId" IN (
      SELECT id FROM "Employee"
      WHERE "tenantId" = current_setting('app.tenant_id', true)
    )
  );

ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "LeaveRequest"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Department"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "PayrollRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "PayrollRun"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Payslip"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "ActivityItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "ActivityItem"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "NotificationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "NotificationItem"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

-- ── Cross-tenant lookup tables ──────────────────────────────────────────────
-- No FORCE, no policies: postgres role is unrestricted; anon/authenticated
-- roles are fully blocked (no matching policy = deny).

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
