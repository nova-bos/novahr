-- Recurring fixed-amount pay components per employee. Additive; no existing
-- data depends on this table.
CREATE TABLE IF NOT EXISTS "RecurringPayrollInput" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "employeeId"    TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "label"         TEXT,
    "amount"        DECIMAL(15,2) NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringPayrollInput_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RecurringPayrollInput_tenantId_idx" ON "RecurringPayrollInput"("tenantId");
CREATE INDEX IF NOT EXISTS "RecurringPayrollInput_employeeId_idx" ON "RecurringPayrollInput"("employeeId");
ALTER TABLE "RecurringPayrollInput"
    ADD CONSTRAINT "RecurringPayrollInput_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringPayrollInput"
    ADD CONSTRAINT "RecurringPayrollInput_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
