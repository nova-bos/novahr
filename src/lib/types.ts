export type EmploymentStatus = "active" | "on_leave" | "probation" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract";
export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type LeaveType = "annual" | "sick" | "unpaid" | "family";
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
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
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
  description: string;
  requiresApproval: boolean;
  paid: boolean;
}
