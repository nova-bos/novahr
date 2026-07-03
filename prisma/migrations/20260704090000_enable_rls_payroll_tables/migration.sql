-- Close the RLS coverage gap: the payroll and compliance tables below were
-- created after the original enable_rls migration and never received
-- policies, leaving them reachable across tenants by primary key.
--
-- Same policy shape as 20260619000000_enable_rls: access is allowed when no
-- tenant context is set (seed scripts, migrations, admin tooling) or when the
-- row's tenantId matches the app.tenant_id session variable set by
-- runAsTenant(). FORCE applies the policy to the postgres role Prisma uses.

ALTER TABLE "PayrollProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollProfile" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "PayrollProfile"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "PayrollSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "PayrollSettings"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EarningType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EarningType" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EarningType"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "DeductionType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeductionType" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "DeductionType"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "ComplianceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRecord" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "ComplianceRecord"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "BankExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankExport" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "BankExport"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "PayrollItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "PayrollItem"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EmployeeSalaryHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeSalaryHistory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EmployeeSalaryHistory"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EmployeeNumberConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeNumberConfig" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EmployeeNumberConfig"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "TenantLeavePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantLeavePolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "TenantLeavePolicy"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );
