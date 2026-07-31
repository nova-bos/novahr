-- Migration: variable_pay (Phase 4)
-- Additive and backward-compatible only. Every new Employee column is nullable
-- or has a default, so existing rows are unaffected and the salaried monthly
-- path is untouched. Adds one new table (PayrollInput) for variable, wage-based
-- and commission pay captured against an open payroll run. No existing tables or
-- columns are dropped, renamed, or retyped.

-- Employee: wage basis for variable / wage-based pay. Defaults keep salaried
-- employees behaving exactly as before.
ALTER TABLE "Employee" ADD COLUMN "wageType" TEXT NOT NULL DEFAULT 'salaried';
ALTER TABLE "Employee" ADD COLUMN "hourlyRate" DECIMAL(15,2);
ALTER TABLE "Employee" ADD COLUMN "dailyRate" DECIMAL(15,2);
ALTER TABLE "Employee" ADD COLUMN "weeklyRate" DECIMAL(15,2);
ALTER TABLE "Employee" ADD COLUMN "ordinaryHoursPerMonth" DECIMAL(15,2);

-- CreateTable
CREATE TABLE "PayrollInput" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(15,2),
    "rate" DECIMAL(15,2),
    "amount" DECIMAL(15,2) NOT NULL,
    "taxTreatment" TEXT NOT NULL DEFAULT 'regular',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollInput_tenantId_idx" ON "PayrollInput"("tenantId");
CREATE INDEX "PayrollInput_payrollRunId_idx" ON "PayrollInput"("payrollRunId");

-- AddForeignKey
ALTER TABLE "PayrollInput" ADD CONSTRAINT "PayrollInput_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollInput" ADD CONSTRAINT "PayrollInput_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollInput" ADD CONSTRAINT "PayrollInput_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
