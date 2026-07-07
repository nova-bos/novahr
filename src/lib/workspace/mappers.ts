import type {
  ActivityItem as PrismaActivityItem,
  Department as PrismaDepartment,
  LeaveRequest as PrismaLeaveRequest,
  NotificationItem as PrismaNotificationItem,
  PayrollRun as PrismaPayrollRun,
  Payslip as PrismaPayslip,
  Prisma,
  Tenant as PrismaTenant,
} from "@prisma/client";
import type {
  ActivityItem,
  BankDetails,
  Department,
  Employee,
  LeaveRequest,
  NotificationItem,
  Onboarding,
  PayrollRun,
  Payslip,
  PayslipLineItem,
  Tenant,
} from "../types";

export type EmployeeWithBalances = Prisma.EmployeeGetPayload<{ include: { leaveBalances: true } }>;

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Pins a naive datetime string (no `Z`/offset, as used in `src/demo/activity.ts`,
 * `src/demo/notifications.ts`, and `src/demo/payroll.ts`'s `processedOn`) to UTC, so seed-write and
 * read-back round-trip to the same string regardless of server timezone.
 */
export function parseTimestamp(value: string): Date {
  return new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

export function mapTenant(row: PrismaTenant): Tenant {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    initials: row.initials,
    industry: row.industry,
    color: row.color,
    founded: row.founded,
    currency: row.currency,
    payFrequency: row.payFrequency,
    registrationNumber: row.registrationNumber,
    vatNumber: row.vatNumber,
    address: row.address,
    city: row.city,
    payDay: row.payDay,
    bankName: row.bankName,
    primaryContact: row.primaryContact,
    plan: (row.plan ?? "trial") as Tenant["plan"],
    trialEndsAt: row.trialEndsAt?.toISOString(),
  };
}

// SA ID number encodes date of birth in the first 6 digits: YYMMDD.
// Uses a sliding century window: YY <= current 2-digit year -> 2000s, else 1900s.
export function dateOfBirthFromIdNumber(idNumber: string): string | undefined {
  if (!idNumber || idNumber.length < 6) return undefined;
  const yy = idNumber.slice(0, 2);
  const mm = idNumber.slice(2, 4);
  const dd = idNumber.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century = Number(yy) <= currentYY ? "20" : "19";
  return `${century}${yy}-${mm}-${dd}`;
}

export function mapEmployee(row: EmployeeWithBalances): Employee {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    preferredName: row.preferredName ?? undefined,
    email: row.email,
    phone: row.phone,
    avatarColor: row.avatarColor,
    initials: row.initials,
    photoUrl: row.photoUrl ?? undefined,
    jobTitle: row.jobTitle,
    department: row.department,
    employmentType: row.employmentType,
    status: row.status,
    startDate: toDateOnly(row.startDate),
    location: row.location,
    managerId: row.managerId ?? undefined,
    salary: {
      annualGross: row.salaryAnnualGross,
      currency: row.salaryCurrency,
      payFrequency: row.salaryPayFrequency,
      travelAllowance: row.salaryTravelAllowance ?? undefined,
      housingAllowance: row.salaryHousingAllowance ?? undefined,
      pensionContributionPct: row.salaryPensionContributionPct ?? undefined,
      medicalAid: row.salaryMedicalAid ?? undefined,
    },
    bankDetails: {
      bank: row.bankName,
      accountNumber: row.bankAccountNumber,
      branchCode: row.bankBranchCode,
      accountType: row.bankAccountType as BankDetails["accountType"],
      validated: row.bankAccountValidated,
      validatedAt: row.bankValidatedAt?.toISOString() ?? null,
    },
    taxNumber: row.taxNumber,
    idNumber: row.idNumber,
    dateOfBirth: dateOfBirthFromIdNumber(row.idNumber),
    address: row.address,
    emergencyContact: {
      name: row.emergencyContactName,
      relationship: row.emergencyContactRelationship,
      phone: row.emergencyContactPhone,
    },
    leaveBalances: row.leaveBalances.map((balance) => ({
      type: balance.type,
      total: balance.total,
      used: balance.used,
    })),
    onboarding: (row.onboarding as unknown as Onboarding | null) ?? undefined,
  };
}

export function mapDepartment(row: PrismaDepartment): Department {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    headId: row.headId ?? undefined,
    color: row.color,
    budget: row.budget,
  };
}

export function mapLeaveRequest(row: PrismaLeaveRequest): LeaveRequest {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    type: row.type,
    startDate: toDateOnly(row.startDate),
    endDate: toDateOnly(row.endDate),
    days: row.days,
    reason: row.reason,
    documentPath: row.documentUrl ?? undefined,
    status: row.status,
    appliedOn: toDateOnly(row.appliedOn),
    decisionNote: row.decisionNote ?? undefined,
    decidedBy: row.decidedBy ?? undefined,
    decidedOn: row.decidedOn ? toDateOnly(row.decidedOn) : undefined,
  };
}

export function mapPayslip(row: PrismaPayslip): Payslip {
  return {
    id: row.id,
    tenantId: row.tenantId,
    runId: row.runId,
    employeeId: row.employeeId,
    period: row.period,
    payDate: toDateOnly(row.payDate),
    basicSalary: row.basicSalary,
    earnings: row.earnings as unknown as PayslipLineItem[],
    deductions: row.deductions as unknown as PayslipLineItem[],
    grossPay: row.grossPay,
    totalDeductions: row.totalDeductions,
    netPay: row.netPay,
    paye: row.paye,
    uif: row.uif,
  };
}

export function mapPayrollRun(row: PrismaPayrollRun, payslipIds: string[]): PayrollRun {
  return {
    id: row.id,
    tenantId: row.tenantId,
    period: row.period,
    label: row.label,
    payDate: toDateOnly(row.payDate),
    status: row.status,
    totalGross: row.totalGross,
    totalDeductions: row.totalDeductions,
    totalNet: row.totalNet,
    totalPaye: row.totalPaye,
    totalUif: row.totalUif,
    employeeCount: row.employeeCount,
    payslipIds,
    processedOn: row.processedOn ? toTimestamp(row.processedOn) : undefined,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ? toTimestamp(row.approvedAt) : undefined,
    approvalNote: row.approvalNote ?? undefined,
  };
}

export function mapActivityItem(row: PrismaActivityItem): ActivityItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    message: row.message,
    actor: row.actor,
    timestamp: toTimestamp(row.timestamp),
    employeeId: row.employeeId ?? undefined,
  };
}

export function mapNotificationItem(row: PrismaNotificationItem): NotificationItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    timestamp: toTimestamp(row.timestamp),
    read: row.read,
    type: row.type,
  };
}
