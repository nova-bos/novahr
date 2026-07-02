export type EmploymentStatus = "active" | "on_leave" | "probation" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract";
export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type LeaveType =
  | "annual"
  | "sick"
  | "unpaid"
  | "family"
  | "maternity"
  | "parental"
  | "adoption"
  | "commissioning"
  | "study";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PayrollRunStatus = "scheduled" | "processing" | "completed";
export type ActivityType =
  | "hire"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "payroll_run"
  | "promotion"
  | "document"
  | "termination"
  | "onboarding";

export interface OnboardingStep {
  id: string;
  label: string;
  complete: boolean;
}

export interface Onboarding {
  progress: number;
  startDate: string;
  buddy?: string;
  steps: OnboardingStep[];
}

export interface BankDetails {
  bank: string;
  accountNumber: string;
  branchCode: string;
  accountType: "Cheque" | "Savings";
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface SalaryInfo {
  annualGross: number;
  currency: string;
  payFrequency: PayFrequency;
  travelAllowance?: number;
  housingAllowance?: number;
  pensionContributionPct?: number;
  medicalAid?: number;
  hasLogbook?: boolean;
  medicalAidDependants?: number;
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  cycleStartDate?: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  avatarColor: string;
  initials: string;
  photoUrl?: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  location: string;
  managerId?: string;
  salary: SalaryInfo;
  bankDetails: BankDetails;
  taxNumber: string;
  idNumber: string;
  dateOfBirth?: string;
  address: string;
  emergencyContact: EmergencyContact;
  leaveBalances: LeaveBalance[];
  onboarding?: Onboarding;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  documentUrl?: string;
  status: LeaveStatus;
  appliedOn: string;
  decisionNote?: string;
  decidedBy?: string;
  decidedOn?: string;
}

export interface PayslipLineItem {
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  tenantId: string;
  runId: string;
  employeeId: string;
  period: string;
  payDate: string;
  basicSalary: number;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  uif: number;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  period: string;
  label: string;
  payDate: string;
  status: PayrollRunStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPaye: number;
  totalUif: number;
  employeeCount: number;
  payslipIds: string[];
  processedOn?: string;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  headId?: string;
  color: string;
  budget: number;
}

export type TenantPlan = "trial" | "hr" | "hr_payroll";

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  initials: string;
  industry: string;
  color: string;
  founded: string;
  currency: string;
  payFrequency: PayFrequency;
  registrationNumber: string;
  vatNumber: string;
  address: string;
  city: string;
  payDay: number;
  bankName: string;
  primaryContact: string;
  plan: TenantPlan;
  trialEndsAt?: string;
}

// Payroll compliance types

export interface PayrollProfile {
  id: string;
  tenantId: string;
  employeeId: string;
  status: "active" | "inactive";
  taxNumber?: string;
  uifNumber?: string;
  taxDirective?: string;
  taxDirectiveAmount?: number;
  payFrequency: PayFrequency;
  medicalAidScheme?: string;
  medicalAidNumber?: string;
  medicalAidDependants: number;
  retirementFundName?: string;
  retirementFundNumber?: string;
  notes?: string;
}

export interface EarningType {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  isTaxable: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export interface DeductionType {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  isEmployer: boolean;
  isStatutory: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export interface ComplianceRecord {
  id: string;
  tenantId: string;
  period: string;
  type: string;
  status: string;
  totalPaye: number;
  totalUif: number;
  totalSdl: number;
  totalAmount: number;
  dueDate?: string;
  submittedOn?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankExport {
  id: string;
  tenantId: string;
  payrollRunId: string;
  status: string;
  totalAmount: number;
  paymentCount: number;
  bankName?: string;
  fileFormat: string;
  exportedAt?: string;
  createdAt: string;
}

export interface PayrollSettings {
  id: string;
  tenantId: string;
  taxYearStart: string;
  taxYearEnd: string;
  sdlEnabled: boolean;
  sdlRate: number;
  uifEnabled: boolean;
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifCeiling: number;
  payslipCompanyName?: string;
  payslipLogoUrl?: string;
  payslipAccentColor: string;
  requireApproval: boolean;
  approvalUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  tenantId: string;
  type: ActivityType;
  message: string;
  actor: string;
  timestamp: string;
  employeeId?: string;
}

export interface NotificationItem {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning";
}

export interface LeavePolicy {
  type: LeaveType;
  label: string;
  annualDays: number;
  cycleMonths?: number;
  description: string;
  requiresApproval: boolean;
  paid: boolean;
}
