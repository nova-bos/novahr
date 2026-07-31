export type EmploymentStatus = "active" | "on_leave" | "probation" | "terminated";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "casual"
  | "learnership"
  | "internship";
export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type EquityRace = "african" | "coloured" | "indian" | "white" | "other";
export type EquityGender = "male" | "female" | "other";
export type OccupationalLevel =
  | "top_management"
  | "senior_management"
  | "professional_mid"
  | "skilled_technical"
  | "semi_skilled"
  | "unskilled";
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
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PayrollRunStatus = "scheduled" | "processing" | "awaiting_approval" | "completed";
export type ActivityType =
  | "hire"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled"
  | "payroll_run"
  | "promotion"
  | "document"
  | "termination"
  | "onboarding"
  | "settings_updated";

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
  validated: boolean;
  validatedAt: string | null;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface NextOfKin {
  name: string;
  relationship: string;
  phone: string;
  address: string;
}

export type IdType = "sa_id" | "passport";
export type Gender = "male" | "female" | "other";
export type MaritalStatus =
  | "single"
  | "married"
  | "customary_marriage"
  | "civil_union"
  | "life_partner"
  | "engaged"
  | "separated"
  | "divorced"
  | "widowed";

export interface EmployeeQualification {
  id: string;
  // degree | diploma | certificate | licence
  type: string;
  name: string;
  institution?: string;
  yearCompleted?: number;
  expiresAt?: string;
}

export interface CustomFieldValue {
  definitionId: string;
  value: string;
}

/**
 * An employer-paid benefit (e.g. an employer-owned income protection policy).
 * It is not cash paid to the employee, so it never appears in gross earnings or
 * as a deduction. When `taxable` is true it is a fringe benefit: its value is
 * added to remuneration for PAYE, SDL, and UIF, so the employee pays tax on it.
 */
export interface EmployerBenefit {
  label: string;
  amount: number;
  taxable: boolean;
}

export interface SalaryInfo {
  annualGross: number;
  currency: string;
  payFrequency: PayFrequency;
  travelAllowance?: number;
  housingAllowance?: number;
  pensionContributionPct?: number;
  medicalAid?: number;
  retirementAnnuity?: number;
  hasLogbook?: boolean;
  medicalAidDependants?: number;
  employerBenefits?: EmployerBenefit[];
  // True when the employee belongs to a medical scheme, even if they pay for it
  // privately (no payroll contribution). Lets the SARS medical tax credit apply
  // on assessment terms.
  isMedicalAidMember?: boolean;
  // Wage basis for variable / wage-based pay (Phase 4). "salaried" is the
  // default and leaves the monthly calculation untouched. The rates are used
  // upstream (capture helpers) to compute variable-pay amounts.
  wageType?: "salaried" | "hourly" | "daily" | "weekly";
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  ordinaryHoursPerMonth?: number;
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  cycleStartDate?: string;
  /**
   * Entitlement earned to date. Equals `total` under the upfront method (and for
   * non-accruing leave types); under accrual it is the annual leave earned so far
   * this year. Computed on the server from the tenant's leave-accrual method and
   * the employee's start date. Falls back to `total` when absent.
   */
  accrued?: number;
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
  /** Optional branch. Undefined/null means whole company / head office. */
  branchId?: string;
  salary: SalaryInfo;
  bankDetails: BankDetails;
  taxNumber: string;
  idType?: IdType;
  idNumber: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  address: string;
  emergencyContact: EmergencyContact;
  nextOfKin?: NextOfKin;
  emergencyContactSameAsNextOfKin?: boolean;
  skills?: string[];
  languages?: string[];
  qualifications?: EmployeeQualification[];
  customFields?: CustomFieldValue[];
  equityRace?: EquityRace;
  equityGender?: EquityGender;
  occupationalLevel?: OccupationalLevel;
  foreignNational?: boolean;
  hasDisability?: boolean;
  leaveBalances: LeaveBalance[];
  onboarding?: Onboarding;
  terminatedAt?: string | null;
  terminationReason?: string | null;
}

export interface DaySelection {
  date: string;
  type: "full" | "partial";
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  daySelections?: DaySelection[];
  reason: string;
  // Storage object path in the private "leave-documents" bucket, not a URL.
  // Read through getLeaveDocumentUrl to obtain a short-lived signed URL.
  documentPath?: string;
  status: LeaveStatus;
  appliedOn: string;
  decisionNote?: string;
  decidedBy?: string;
  decidedOn?: string;
  cancelledBy?: string;
  cancelledOn?: string;
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
  // Employer-side contributions. Informational only (not deducted from net
  // pay), surfaced on statutory payslip templates and used for EMP201
  // reconciliation. Optional so payslips created before these were persisted
  // still map cleanly.
  employerUif?: number;
  employerSdl?: number;
  // Snapshot of employer-paid benefits at run time, so a historical payslip
  // stays accurate even if the employee's benefit configuration later changes.
  employerBenefits?: EmployerBenefit[];
  // Outstanding balances (e.g. employer loans, garnishees) remaining after this
  // run's instalment, snapshotted so the payslip shows a closing balance.
  closingBalances?: { label: string; balance: number }[];
  // Basis for the PAYE figure, surfaced so employees can see how their tax was
  // derived: the annual taxable income the SARS tables were applied to, and the
  // annual rebate subtracted.
  taxableIncomeAnnual?: number;
  taxRebateAnnual?: number;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  period: string;
  label: string;
  payDate: string;
  status: PayrollRunStatus;
  /** Optional branch this run targets. Undefined/null means the whole company. */
  branchId?: string;
  /**
   * Run classification. "regular" (or undefined) is the normal monthly
   * scheduled run; "off_cycle" is an ad-hoc bonus or correction run.
   */
  runType?: "regular" | "off_cycle";
  /** Free-text reason for an off-cycle run. Undefined for regular runs. */
  runReason?: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPaye: number;
  totalUif: number;
  employeeCount: number;
  payslipIds: string[];
  processedOn?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
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

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  isDefault: boolean;
  isActive: boolean;
}

export type TenantPlan = "trial" | "subscribed" | "enterprise";

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
  payrollDisclaimerAcceptedAt?: string | null;
  logoUrl?: string;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  showBirthdaysOnCalendar?: boolean;
}

export type DisciplinaryType =
  | "warning_verbal"
  | "warning_written"
  | "final_warning"
  | "suspension"
  | "dismissal"
  | "counselling";

export interface DisciplinaryRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  type: DisciplinaryType;
  description: string;
  issuedAt: string;
  expiresAt?: string | null;
  createdBy: string;
  documentId?: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  audience: "all" | "managers";
  isPublished: boolean;
  publishedAt?: string | null;
  createdBy: string;
  createdAt: string;
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
  // Audience scoping. Mirrors the server-side fields so the client can filter
  // optimistically-added notifications to the same rules the workspace query uses.
  audienceRole?: string | null;
  recipientEmployeeId?: string | null;
}

export type CustomFieldType = "text" | "number" | "date" | "select";

export interface TenantCustomFieldDefinition {
  id: string;
  tenantId: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface CustomHoliday {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  recurring: boolean;
}

export interface LeaveReviewer {
  id: string;
  tenantId: string;
  reviewerEmployeeId: string;
  scope: "all" | "department" | "employee";
  scopeId?: string;
  label?: string;
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
