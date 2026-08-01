-- EmployeeHistoryEvent: structured promotion/transfer history. Additive; no
-- existing data depends on this table.
CREATE TABLE IF NOT EXISTS "EmployeeHistoryEvent" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "employeeId"    TEXT NOT NULL,
    "type"          TEXT NOT NULL,
    "field"         TEXT NOT NULL,
    "oldValue"      TEXT,
    "newValue"      TEXT,
    "changedBy"     TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeHistoryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmployeeHistoryEvent_tenantId_idx" ON "EmployeeHistoryEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "EmployeeHistoryEvent_employeeId_idx" ON "EmployeeHistoryEvent"("employeeId");
ALTER TABLE "EmployeeHistoryEvent"
    ADD CONSTRAINT "EmployeeHistoryEvent_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeHistoryEvent"
    ADD CONSTRAINT "EmployeeHistoryEvent_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
