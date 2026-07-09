-- Baseline v1 (2026-07-09)
--
-- This migration replaces the previous 8-migration history, which had
-- drifted from the real schema: 13 tables (payroll, compliance, bank
-- exports, documents) were created on the live database with `prisma db
-- push` and manual SQL but never captured as migrations, and the Netcash
-- columns were renamed outside migrate. Replaying the old folder onto a
-- fresh database failed. This file is the full, correct schema as deployed,
-- generated with `prisma migrate diff --from-empty --to-schema` plus the
-- RLS layer and the bank-export submission ledger index.
--
-- The live database ledger was re-pointed at this baseline with
-- `prisma migrate resolve --applied 20260709120000_baseline_v1`.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('employee', 'manager', 'hr', 'exco');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('active', 'on_leave', 'probation', 'terminated');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contract');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('monthly', 'biweekly', 'weekly');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('annual', 'sick', 'unpaid', 'family', 'maternity', 'parental', 'adoption', 'commissioning', 'study');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('scheduled', 'processing', 'awaiting_approval', 'completed');

-- CreateEnum
CREATE TYPE "PayslipTemplate" AS ENUM ('classic', 'modern', 'corporate', 'branded');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('hire', 'leave_request', 'leave_approved', 'leave_rejected', 'payroll_run', 'promotion', 'document', 'termination', 'onboarding', 'settings_updated');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('trial', 'hr', 'hr_payroll');

-- CreateEnum
CREATE TYPE "PayrollProfileStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "EarningCategory" AS ENUM ('basic_salary', 'overtime', 'bonus', 'commission', 'travel_allowance', 'housing_allowance', 'other_allowance');

-- CreateEnum
CREATE TYPE "DeductionCategory" AS ENUM ('paye', 'uif', 'medical_aid', 'retirement_fund', 'garnishee', 'loan_repayment', 'other');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('paye_return', 'uif_return', 'sdl_return', 'emp201', 'emp501');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('pending', 'submitted', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "BankExportStatus" AS ENUM ('pending', 'approved', 'exported', 'cancelled');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'revoked');

-- CreateEnum
CREATE TYPE "EmployeeDocumentCategory" AS ENUM ('contract', 'id_document', 'qualification', 'certificate', 'disciplinary', 'medical', 'other');

-- CreateEnum
CREATE TYPE "DeductionKind" AS ENUM ('loan', 'garnishee', 'other');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('active', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "EquityRace" AS ENUM ('african', 'coloured', 'indian', 'white', 'other');

-- CreateEnum
CREATE TYPE "EquityGender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "OccupationalLevel" AS ENUM ('top_management', 'senior_management', 'professional_mid', 'skilled_technical', 'semi_skilled', 'unskilled');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "founded" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'monthly',
    "registrationNumber" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "payDay" INTEGER NOT NULL DEFAULT 25,
    "bankName" TEXT NOT NULL,
    "primaryContact" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'hr',
    "employeeId" TEXT,
    "avatarColor" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "photoUrl" TEXT,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "managerId" TEXT,
    "salaryAnnualGross" DECIMAL(15,2) NOT NULL,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'ZAR',
    "salaryPayFrequency" "PayFrequency" NOT NULL DEFAULT 'monthly',
    "salaryTravelAllowance" DECIMAL(15,2),
    "salaryHousingAllowance" DECIMAL(15,2),
    "salaryPensionContributionPct" DOUBLE PRECISION,
    "salaryMedicalAid" DECIMAL(15,2),
    "bankName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankBranchCode" TEXT NOT NULL,
    "bankAccountType" TEXT NOT NULL,
    "bankAccountValidated" BOOLEAN NOT NULL DEFAULT false,
    "bankValidatedAt" TIMESTAMP(3),
    "taxNumber" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "equityRace" "EquityRace",
    "equityGender" "EquityGender",
    "occupationalLevel" "OccupationalLevel",
    "foreignNational" BOOLEAN NOT NULL DEFAULT false,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "onboarding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "appliedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionNote" TEXT,
    "decidedBy" TEXT,
    "decidedOn" TIMESTAMP(3),

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "headId" TEXT,
    "color" TEXT NOT NULL,
    "budget" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'scheduled',
    "totalGross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalPaye" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalUif" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "processedOn" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "basicSalary" DECIMAL(15,2) NOT NULL,
    "earnings" JSONB NOT NULL,
    "deductions" JSONB NOT NULL,
    "grossPay" DECIMAL(15,2) NOT NULL,
    "totalDeductions" DECIMAL(15,2) NOT NULL,
    "netPay" DECIMAL(15,2) NOT NULL,
    "paye" DECIMAL(15,2) NOT NULL,
    "uif" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "employeeId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL,

    CONSTRAINT "NotificationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PayrollProfileStatus" NOT NULL DEFAULT 'active',
    "taxNumber" TEXT,
    "uifNumber" TEXT,
    "taxDirective" TEXT,
    "taxDirectiveAmount" DECIMAL(15,2),
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'monthly',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medicalAidScheme" TEXT,
    "medicalAidNumber" TEXT,
    "medicalAidDependants" INTEGER NOT NULL DEFAULT 0,
    "retirementFundName" TEXT,
    "retirementFundNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EarningCategory" NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarningType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeductionType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DeductionCategory" NOT NULL,
    "isEmployer" BOOLEAN NOT NULL DEFAULT false,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeductionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'pending',
    "totalPaye" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalUif" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalSdl" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalEti" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "etiCarriedForward" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "submittedOn" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "status" "BankExportStatus" NOT NULL DEFAULT 'pending',
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paymentCount" INTEGER NOT NULL,
    "bankName" TEXT,
    "fileFormat" TEXT NOT NULL DEFAULT 'csv',
    "exportedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taxYearStart" TEXT NOT NULL DEFAULT '03',
    "taxYearEnd" TEXT NOT NULL DEFAULT '02',
    "sdlEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sdlRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "uifEnabled" BOOLEAN NOT NULL DEFAULT true,
    "uifEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "uifEmployerRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "uifCeiling" DECIMAL(15,2) NOT NULL DEFAULT 17712,
    "payslipCompanyName" TEXT,
    "payslipLogoUrl" TEXT,
    "payslipAccentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "payslipTemplate" "PayslipTemplate" NOT NULL DEFAULT 'classic',
    "payslipFooterNote" TEXT,
    "payslipShowBanking" BOOLEAN NOT NULL DEFAULT false,
    "payslipShowYtd" BOOLEAN NOT NULL DEFAULT true,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalUserId" TEXT,
    "netcashSalaryKey" TEXT,
    "netcashAccountServicesKey" TEXT,
    "netcashInstruction" TEXT NOT NULL DEFAULT 'DatedSalaries',
    "netcashEnvironment" TEXT NOT NULL DEFAULT 'production',
    "payeReferenceNumber" TEXT,
    "uifReferenceNumber" TEXT,
    "sdlReferenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    "isEmployer" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(15,2) NOT NULL,
    "ytdAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "employeeId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "annualGross" DECIMAL(15,2) NOT NULL,
    "payFrequency" "PayFrequency" NOT NULL,
    "travelAllowance" DECIMAL(15,2),
    "housingAllowance" DECIMAL(15,2),
    "medicalAid" DECIMAL(15,2),
    "pensionContribPct" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSalaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeNumberConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'EMP',
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "separator" TEXT NOT NULL DEFAULT '-',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeNumberConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "annualDays" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "sickDays" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "familyDays" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "maternityDays" DOUBLE PRECISION NOT NULL DEFAULT 88,
    "parentalDays" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "adoptionDays" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "commissioningDays" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "studyDays" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "unpaidDays" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "annualCarryover" BOOLEAN NOT NULL DEFAULT true,
    "annualMaxCarryoverDays" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "sickRequireDocDays" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EmployeeDocumentCategory" NOT NULL DEFAULT 'other',
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDeduction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" "DeductionKind" NOT NULL DEFAULT 'loan',
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "monthlyAmount" DECIMAL(15,2) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtiClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "qualifyingMonth" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtiClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_type_key" ON "LeaveBalance"("employeeId", "type");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_idx" ON "LeaveRequest"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_idx" ON "PayrollRun"("tenantId");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_idx" ON "Payslip"("tenantId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE INDEX "ActivityItem_tenantId_idx" ON "ActivityItem"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationItem_tenantId_idx" ON "NotificationItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollProfile_employeeId_key" ON "PayrollProfile"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollProfile_tenantId_idx" ON "PayrollProfile"("tenantId");

-- CreateIndex
CREATE INDEX "EarningType_tenantId_idx" ON "EarningType"("tenantId");

-- CreateIndex
CREATE INDEX "DeductionType_tenantId_idx" ON "DeductionType"("tenantId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_tenantId_idx" ON "ComplianceRecord"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_tenantId_period_type_key" ON "ComplianceRecord"("tenantId", "period", "type");

-- CreateIndex
CREATE INDEX "BankExport_tenantId_idx" ON "BankExport"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSettings_tenantId_key" ON "PayrollSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_idx" ON "PayrollItem"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollItem_payslipId_idx" ON "PayrollItem"("payslipId");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE INDEX "Invite_tenantId_idx" ON "Invite"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeSalaryHistory_tenantId_idx" ON "EmployeeSalaryHistory"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeSalaryHistory_employeeId_idx" ON "EmployeeSalaryHistory"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeNumberConfig_tenantId_key" ON "EmployeeNumberConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLeavePolicy_tenantId_key" ON "TenantLeavePolicy"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_tenantId_idx" ON "EmployeeDocument"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_tenantId_idx" ON "EmployeeDeduction"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeDeduction_employeeId_idx" ON "EmployeeDeduction"("employeeId");

-- CreateIndex
CREATE INDEX "EtiClaim_tenantId_idx" ON "EtiClaim"("tenantId");

-- CreateIndex
CREATE INDEX "EtiClaim_employeeId_idx" ON "EtiClaim"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EtiClaim_employeeId_period_key" ON "EtiClaim"("employeeId", "period");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityItem" ADD CONSTRAINT "ActivityItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationItem" ADD CONSTRAINT "NotificationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollProfile" ADD CONSTRAINT "PayrollProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollProfile" ADD CONSTRAINT "PayrollProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningType" ADD CONSTRAINT "EarningType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeductionType" ADD CONSTRAINT "DeductionType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankExport" ADD CONSTRAINT "BankExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankExport" ADD CONSTRAINT "BankExport_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSettings" ADD CONSTRAINT "PayrollSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryHistory" ADD CONSTRAINT "EmployeeSalaryHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryHistory" ADD CONSTRAINT "EmployeeSalaryHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeNumberConfig" ADD CONSTRAINT "EmployeeNumberConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLeavePolicy" ADD CONSTRAINT "TenantLeavePolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeduction" ADD CONSTRAINT "EmployeeDeduction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeduction" ADD CONSTRAINT "EmployeeDeduction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiClaim" ADD CONSTRAINT "EtiClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiClaim" ADD CONSTRAINT "EtiClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Row-Level Security
-- ============================================================

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

-- Tables added after the second RLS migration; same policy shape.

ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Invite"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EmployeeDeduction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeDeduction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EmployeeDeduction"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EmployeeDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EmployeeDocument"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

ALTER TABLE "EtiClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EtiClaim" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "EtiClaim"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

-- ============================================================
-- Bank export submission ledger: at most one active (pending or
-- exported) Netcash NIF submission per payroll run. Backs the
-- find-then-claim logic in src/lib/bank-exports/actions.ts so a race
-- or crashed retry can never produce a double salary payment.
-- Partial indexes cannot be expressed in the Prisma schema; do not
-- let `prisma migrate dev` drop this index.
-- ============================================================

CREATE UNIQUE INDEX "BankExport_active_nif_per_run_key"
  ON "BankExport" ("payrollRunId")
  WHERE "fileFormat" = 'nif' AND "status" IN ('pending', 'exported');
