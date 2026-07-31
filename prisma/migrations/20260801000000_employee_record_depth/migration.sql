-- Migration: employee_record_depth (Phase 3)
-- Additive and backward-compatible only. Every new Employee column is nullable
-- or has a default, so existing rows are unaffected. Adds three new tables for
-- qualifications and tenant-defined custom fields. No existing tables or
-- columns are dropped, renamed, or retyped.

-- Employee: identity document, demographics, next of kin, skills and languages.
ALTER TABLE "Employee" ADD COLUMN "idType" TEXT NOT NULL DEFAULT 'sa_id';
ALTER TABLE "Employee" ADD COLUMN "passportNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nationality" TEXT;
ALTER TABLE "Employee" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "gender" TEXT;
ALTER TABLE "Employee" ADD COLUMN "maritalStatus" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nextOfKinName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nextOfKinRelationship" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nextOfKinPhone" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nextOfKinAddress" TEXT;
ALTER TABLE "Employee" ADD COLUMN "emergencyContactSameAsNextOfKin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Employee" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "EmployeeQualification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "yearCompleted" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantCustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCustomFieldValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "EmployeeCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeQualification_tenantId_idx" ON "EmployeeQualification"("tenantId");
CREATE INDEX "EmployeeQualification_employeeId_idx" ON "EmployeeQualification"("employeeId");
CREATE INDEX "TenantCustomFieldDefinition_tenantId_idx" ON "TenantCustomFieldDefinition"("tenantId");
CREATE INDEX "EmployeeCustomFieldValue_tenantId_idx" ON "EmployeeCustomFieldValue"("tenantId");
CREATE INDEX "EmployeeCustomFieldValue_employeeId_idx" ON "EmployeeCustomFieldValue"("employeeId");
CREATE UNIQUE INDEX "EmployeeCustomFieldValue_employeeId_definitionId_key" ON "EmployeeCustomFieldValue"("employeeId", "definitionId");

-- AddForeignKey
ALTER TABLE "EmployeeQualification" ADD CONSTRAINT "EmployeeQualification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeQualification" ADD CONSTRAINT "EmployeeQualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantCustomFieldDefinition" ADD CONSTRAINT "TenantCustomFieldDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeCustomFieldValue" ADD CONSTRAINT "EmployeeCustomFieldValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeCustomFieldValue" ADD CONSTRAINT "EmployeeCustomFieldValue_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeCustomFieldValue" ADD CONSTRAINT "EmployeeCustomFieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "TenantCustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
