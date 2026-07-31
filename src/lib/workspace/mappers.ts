import { accruedEntitlement } from "@/lib/leave/accrual";
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
  DaySelection,
  Department,
  Employee,
  EmployerBenefit,
  LeaveRequest,
  NotificationItem,
  Onboarding,
  PayrollRun,
  Payslip,
  PayslipLineItem,
  SalaryInfo,
  Tenant,
} from "../types";

export type EmployeeWithBalances = Prisma.EmployeeGetPayload<{ include: { leaveBalances: true } }>;

// Optional relations the mapper reads when they have been included. They are
// not part of the base include so existing queries keep working unchanged.
type EmployeeQualificationRow = Prisma.EmployeeQualificationGetPayload<object>;
type EmployeeCustomFieldValueRow = Prisma.EmployeeCustomFieldValueGetPayload<object>;
type EmployeeRelations = {
  qualifications?: EmployeeQualificationRow[];
  customFieldValues?: EmployeeCustomFieldValueRow[];
};

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Converts a money value from the data layer to a plain number. Prisma returns
 * Decimal for @db.Decimal columns; this also tolerates a plain number (as used
 * by loosely-typed test mocks), keeping the mapper boundary robust.
 */
export function decToNumber(v: Prisma.Decimal | number): number {
  return typeof v === "number" ? v : v.toNumber();
}

/**
 * Pins a naive datetime string (no `Z`/offset, as used in `src/demo/activity.ts`,
 * `src/demo/notifications.ts`, and `src/demo/payroll.ts`'s `processedOn`) to UTC, so seed-write and
 * read-back round-trip to the same string regardless of server timezone.
 */
export function parseTimestamp(value: string): Date {
  return new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

export function mapTenant(row: PrismaTenant, logoUrl?: string | null): Tenant {
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
    payrollDisclaimerAcceptedAt: row.payrollDisclaimerAcceptedAt?.toISOString() ?? null,
    logoUrl: logoUrl ?? undefined,
    subscriptionStatus: row.subscriptionStatus ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    paystackCustomerCode: row.paystackCustomerCode ?? null,
    paystackSubscriptionCode: row.paystackSubscriptionCode ?? null,
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
  const rel = row as EmployeeWithBalances & EmployeeRelations;
  // Date of birth: for SA-ID holders it is derived from the ID; for passport
  // holders (or any row that stored one explicitly) use the persisted column.
  const derivedDob =
    row.idType === "passport" ? undefined : dateOfBirthFromIdNumber(row.idNumber);
  const dateOfBirth = row.dateOfBirth ? toDateOnly(row.dateOfBirth) : derivedDob;
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
      annualGross: decToNumber(row.salaryAnnualGross),
      currency: row.salaryCurrency,
      payFrequency: row.salaryPayFrequency,
      travelAllowance: row.salaryTravelAllowance != null ? decToNumber(row.salaryTravelAllowance) : undefined,
      housingAllowance: row.salaryHousingAllowance != null ? decToNumber(row.salaryHousingAllowance) : undefined,
      pensionContributionPct: row.salaryPensionContributionPct ?? undefined,
      medicalAid: row.salaryMedicalAid != null ? decToNumber(row.salaryMedicalAid) : undefined,
      retirementAnnuity: row.salaryRetirementAnnuity != null ? decToNumber(row.salaryRetirementAnnuity) : undefined,
      employerBenefits: (row.salaryEmployerBenefits as unknown as EmployerBenefit[] | null) ?? undefined,
      wageType: (row.wageType as SalaryInfo["wageType"]) ?? "salaried",
      hourlyRate: row.hourlyRate != null ? decToNumber(row.hourlyRate) : undefined,
      dailyRate: row.dailyRate != null ? decToNumber(row.dailyRate) : undefined,
      weeklyRate: row.weeklyRate != null ? decToNumber(row.weeklyRate) : undefined,
      ordinaryHoursPerMonth: row.ordinaryHoursPerMonth != null ? decToNumber(row.ordinaryHoursPerMonth) : undefined,
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
    idType: (row.idType as Employee["idType"]) ?? "sa_id",
    idNumber: row.idNumber,
    passportNumber: row.passportNumber ?? undefined,
    nationality: row.nationality ?? undefined,
    dateOfBirth,
    gender: (row.gender as Employee["gender"]) ?? undefined,
    maritalStatus: (row.maritalStatus as Employee["maritalStatus"]) ?? undefined,
    address: row.address,
    emergencyContact: {
      name: row.emergencyContactName,
      relationship: row.emergencyContactRelationship,
      phone: row.emergencyContactPhone,
    },
    nextOfKin:
      row.nextOfKinName || row.nextOfKinRelationship || row.nextOfKinPhone || row.nextOfKinAddress
        ? {
            name: row.nextOfKinName ?? "",
            relationship: row.nextOfKinRelationship ?? "",
            phone: row.nextOfKinPhone ?? "",
            address: row.nextOfKinAddress ?? "",
          }
        : undefined,
    emergencyContactSameAsNextOfKin: row.emergencyContactSameAsNextOfKin ?? false,
    skills: row.skills ?? [],
    languages: row.languages ?? [],
    qualifications: rel.qualifications?.map((q) => ({
      id: q.id,
      type: q.type,
      name: q.name,
      institution: q.institution ?? undefined,
      yearCompleted: q.yearCompleted ?? undefined,
      expiresAt: q.expiresAt ? toDateOnly(q.expiresAt) : undefined,
    })),
    customFields: rel.customFieldValues?.map((v) => ({
      definitionId: v.definitionId,
      value: v.value,
    })),
    equityRace: row.equityRace ?? undefined,
    equityGender: row.equityGender ?? undefined,
    occupationalLevel: row.occupationalLevel ?? undefined,
    foreignNational: row.foreignNational,
    hasDisability: row.hasDisability,
    leaveBalances: row.leaveBalances.map((balance) => ({
      type: balance.type,
      total: balance.total,
      used: balance.used,
      // Entitlement earned to date. Annual leave accrues over the cycle from the
      // employee's start date (BCEA section 20); other types are always full.
      // Computed here so every consumer of a mapped employee (workspace load,
      // post-edit store updates) sees the same accrued figure.
      accrued: accruedEntitlement({
        type: balance.type,
        total: balance.total,
        method: "accrual",
        startDate: row.startDate.toISOString(),
      }),
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
    budget: decToNumber(row.budget),
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
    daySelections: Array.isArray(row.daySelections) ? (row.daySelections as unknown as DaySelection[]) : undefined,
    reason: row.reason,
    documentPath: row.documentUrl ?? undefined,
    status: row.status,
    appliedOn: toDateOnly(row.appliedOn),
    decisionNote: row.decisionNote ?? undefined,
    decidedBy: row.decidedBy ?? undefined,
    decidedOn: row.decidedOn ? toDateOnly(row.decidedOn) : undefined,
    cancelledBy: row.cancelledBy ?? undefined,
    cancelledOn: row.cancelledOn ? toDateOnly(row.cancelledOn) : undefined,
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
    basicSalary: decToNumber(row.basicSalary),
    earnings: row.earnings as unknown as PayslipLineItem[],
    deductions: row.deductions as unknown as PayslipLineItem[],
    grossPay: decToNumber(row.grossPay),
    totalDeductions: decToNumber(row.totalDeductions),
    netPay: decToNumber(row.netPay),
    paye: decToNumber(row.paye),
    uif: decToNumber(row.uif),
    employerUif: row.employerUif != null ? decToNumber(row.employerUif) : undefined,
    employerSdl: row.employerSdl != null ? decToNumber(row.employerSdl) : undefined,
    employerBenefits: (row.employerBenefits as unknown as EmployerBenefit[] | null) ?? undefined,
    closingBalances:
      (row.closingBalances as unknown as { label: string; balance: number }[] | null) ?? undefined,
    taxableIncomeAnnual: row.taxableIncomeAnnual != null ? decToNumber(row.taxableIncomeAnnual) : undefined,
    taxRebateAnnual: row.taxRebateAnnual != null ? decToNumber(row.taxRebateAnnual) : undefined,
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
    totalGross: decToNumber(row.totalGross),
    totalDeductions: decToNumber(row.totalDeductions),
    totalNet: decToNumber(row.totalNet),
    totalPaye: decToNumber(row.totalPaye),
    totalUif: decToNumber(row.totalUif),
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
    audienceRole: row.audienceRole ?? null,
    recipientEmployeeId: row.recipientEmployeeId ?? null,
  };
}
