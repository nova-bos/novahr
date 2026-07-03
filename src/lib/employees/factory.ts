import type { Employee, EmploymentStatus, EmploymentType, LeaveBalance, LeaveType, Onboarding } from "@/lib/types";
import { getInitials } from "@/lib/format";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import { ONBOARDING_STEPS } from "@/demo/employees";

const AVATAR_COLORS = [
  "#4C6FFF",
  "#0F9D8C",
  "#E08A3C",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F43F5E",
  "#6366F1",
  "#14B8A6",
];

// Derives a 2-3 char uppercase prefix from a company name.
// "Nova Technologies" -> "NT", "Apex Financial Group" -> "AFG", "ACME" -> "ACM"
export function deriveEmployeePrefix(companyName: string): string {
  const words = companyName.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]).join("").slice(0, 3);
  return (words[0] ?? "EMP").slice(0, 3);
}

export interface NewEmployeeInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  location: string;
  managerId?: string;
  annualGross: number;
  travelAllowance?: number;
  housingAllowance?: number;
  medicalAid?: number;
}

function defaultLeaveBalances(): LeaveBalance[] {
  return (Object.keys(DEFAULT_LEAVE_TOTALS) as LeaveType[]).map((type) => ({
    type,
    total: DEFAULT_LEAVE_TOTALS[type],
    used: 0,
  }));
}

export function newOnboardingPlan(startDate: string, buddy?: string): Onboarding {
  return {
    progress: 0,
    startDate,
    buddy,
    steps: ONBOARDING_STEPS.map((step) => ({ ...step, complete: false })),
  };
}

export function createEmployee(input: NewEmployeeInput, existingCount: number, companyName?: string): Employee {
  const prefix = deriveEmployeePrefix(companyName ?? input.tenantId);
  const num = existingCount + 1;

  return {
    id: `${input.tenantId}-emp-${Date.now()}`,
    tenantId: input.tenantId,
    employeeNumber: `${prefix}-${String(num).padStart(4, "0")}`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    avatarColor: AVATAR_COLORS[num % AVATAR_COLORS.length],
    initials: getInitials(input.firstName, input.lastName),
    jobTitle: input.jobTitle,
    department: input.department,
    employmentType: input.employmentType,
    status: input.status,
    startDate: input.startDate,
    location: input.location,
    managerId: input.managerId,
    salary: {
      annualGross: input.annualGross,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: input.travelAllowance,
      housingAllowance: input.housingAllowance,
      pensionContributionPct: 0.075,
      medicalAid: input.medicalAid,
    },
    bankDetails: {
      bank: "Pending setup",
      accountNumber: "0000000000",
      branchCode: "000000",
      accountType: "Cheque",
      validated: false,
      validatedAt: null,
    },
    taxNumber: "Pending registration",
    idNumber: "Pending verification",
    address: "Not provided",
    emergencyContact: { name: "Not provided", relationship: "-", phone: "-" },
    leaveBalances: defaultLeaveBalances(),
    onboarding: input.status === "probation" ? newOnboardingPlan(input.startDate) : undefined,
  };
}
