import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type {
  ActivityItem as PrismaActivityItem,
  Department as PrismaDepartment,
  LeaveRequest as PrismaLeaveRequest,
  NotificationItem as PrismaNotificationItem,
  PayrollRun as PrismaPayrollRun,
  Payslip as PrismaPayslip,
  Tenant as PrismaTenant,
} from "@prisma/client";
import {
  type EmployeeWithBalances,
  mapActivityItem,
  mapDepartment,
  mapEmployee,
  mapLeaveRequest,
  mapNotificationItem,
  mapPayrollRun,
  mapPayslip,
  mapTenant,
  parseTimestamp,
  toDateOnly,
  toTimestamp,
} from "./mappers";

describe("toDateOnly", () => {
  it("returns the ISO date portion of a Date", () => {
    expect(toDateOnly(new Date("2026-06-15T10:30:00.000Z"))).toBe("2026-06-15");
  });
});

describe("toTimestamp", () => {
  it("returns the full ISO string of a Date", () => {
    expect(toTimestamp(new Date("2026-06-15T10:30:00.000Z"))).toBe("2026-06-15T10:30:00.000Z");
  });
});

describe("parseTimestamp", () => {
  it("pins a naive datetime string to UTC", () => {
    expect(parseTimestamp("2026-06-15T10:30:00").getTime()).toBe(
      new Date("2026-06-15T10:30:00Z").getTime()
    );
  });

  it("leaves a Z-suffixed timestamp unchanged", () => {
    expect(parseTimestamp("2026-06-15T10:30:00Z").getTime()).toBe(
      new Date("2026-06-15T10:30:00Z").getTime()
    );
  });

  it("leaves a timestamp with an explicit offset unchanged", () => {
    expect(parseTimestamp("2026-06-15T10:30:00+02:00").getTime()).toBe(
      new Date("2026-06-15T10:30:00+02:00").getTime()
    );
  });
});

describe("mapTenant", () => {
  it("maps a Prisma tenant row to the app Tenant type", () => {
    const row: PrismaTenant = {
      id: "novatech",
      name: "NovaTech",
      legalName: "NovaTech (Pty) Ltd",
      initials: "NT",
      industry: "Technology",
      color: "#4C6FFF",
      founded: "2015",
      currency: "ZAR",
      payFrequency: "monthly",
      registrationNumber: "2015/123456/07",
      vatNumber: "4123456789",
      address: "1 Long Street",
      city: "Cape Town",
      payDay: 25,
      bankName: "Standard Bank",
      primaryContact: "hr@novatech.example",
      plan: "hr_payroll",
      trialEndsAt: null,
      payrollDisclaimerAcceptedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };

    expect(mapTenant(row)).toEqual({
      id: "novatech",
      name: "NovaTech",
      legalName: "NovaTech (Pty) Ltd",
      initials: "NT",
      industry: "Technology",
      color: "#4C6FFF",
      founded: "2015",
      currency: "ZAR",
      payFrequency: "monthly",
      registrationNumber: "2015/123456/07",
      vatNumber: "4123456789",
      address: "1 Long Street",
      city: "Cape Town",
      payDay: 25,
      bankName: "Standard Bank",
      primaryContact: "hr@novatech.example",
      plan: "hr_payroll",
      trialEndsAt: undefined,
      payrollDisclaimerAcceptedAt: null,
    });
  });
});

describe("mapEmployee", () => {
  const baseRow: EmployeeWithBalances = {
    id: "emp-1",
    tenantId: "novatech",
    employeeNumber: "NT-0001",
    firstName: "Aisha",
    lastName: "Patel",
    preferredName: null,
    email: "aisha.patel@example.com",
    phone: "+27 71 000 0000",
    avatarColor: "#4C6FFF",
    initials: "AP",
    jobTitle: "Software Engineer",
    department: "Engineering",
    employmentType: "full_time",
    status: "active",
    startDate: new Date("2024-01-15T00:00:00Z"),
    location: "Cape Town",
    managerId: null,
    salaryAnnualGross: new Prisma.Decimal(600_000),
    salaryCurrency: "ZAR",
    salaryPayFrequency: "monthly",
    salaryTravelAllowance: null,
    salaryHousingAllowance: null,
    salaryPensionContributionPct: null,
    salaryMedicalAid: null,
    salaryRetirementAnnuity: null,
    bankName: "Standard Bank",
    bankAccountNumber: "1234567890",
    bankBranchCode: "051001",
    bankAccountType: "Cheque",
    bankAccountValidated: false,
    bankValidatedAt: null,
    taxNumber: "1234567890",
    idNumber: "9001015800082",
    address: "1 Main Street, Cape Town",
    emergencyContactName: "John Patel",
    emergencyContactRelationship: "Spouse",
    emergencyContactPhone: "+27 71 111 1111",
    photoUrl: null,
    equityRace: null,
    equityGender: null,
    occupationalLevel: null,
    foreignNational: false,
    hasDisability: false,
    onboarding: null,
    createdAt: new Date("2024-01-15T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
    leaveBalances: [],
  };

  it("maps nullable fields to undefined", () => {
    const employee = mapEmployee(baseRow);

    expect(employee.preferredName).toBeUndefined();
    expect(employee.managerId).toBeUndefined();
    expect(employee.salary.travelAllowance).toBeUndefined();
    expect(employee.salary.housingAllowance).toBeUndefined();
    expect(employee.salary.pensionContributionPct).toBeUndefined();
    expect(employee.salary.medicalAid).toBeUndefined();
    expect(employee.onboarding).toBeUndefined();
    expect(employee.startDate).toBe("2024-01-15");
  });

  it("maps populated optional fields and leave balances", () => {
    const row: EmployeeWithBalances = {
      ...baseRow,
      preferredName: "Aish",
      managerId: "emp-0",
      salaryTravelAllowance: new Prisma.Decimal(3_000),
      salaryHousingAllowance: new Prisma.Decimal(5_000),
      salaryPensionContributionPct: 0.075,
      salaryMedicalAid: new Prisma.Decimal(2_500),
      onboarding: { progress: 50, startDate: "2024-01-15", steps: [] },
      leaveBalances: [
        { id: "lb-1", employeeId: "emp-1", type: "annual", total: 18, used: 4 },
        { id: "lb-2", employeeId: "emp-1", type: "sick", total: 10, used: 0 },
      ],
    };

    const employee = mapEmployee(row);

    expect(employee.preferredName).toBe("Aish");
    expect(employee.managerId).toBe("emp-0");
    expect(employee.salary).toEqual({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: 3_000,
      housingAllowance: 5_000,
      pensionContributionPct: 0.075,
      medicalAid: 2_500,
    });
    expect(employee.bankDetails).toEqual({
      bank: "Standard Bank",
      accountNumber: "1234567890",
      branchCode: "051001",
      accountType: "Cheque",
      validated: false,
      validatedAt: null,
    });
    expect(employee.onboarding).toEqual({ progress: 50, startDate: "2024-01-15", steps: [] });
    expect(employee.leaveBalances).toEqual([
      { type: "annual", total: 18, used: 4 },
      { type: "sick", total: 10, used: 0 },
    ]);
  });
});

describe("mapDepartment", () => {
  it("maps a null headId to undefined", () => {
    const row: PrismaDepartment = {
      id: "dept-eng",
      tenantId: "novatech",
      name: "Engineering",
      description: "Builds the product",
      headId: null,
      color: "#4C6FFF",
      budget: new Prisma.Decimal(1_000_000),
    };

    expect(mapDepartment(row)).toEqual({
      id: "dept-eng",
      tenantId: "novatech",
      name: "Engineering",
      description: "Builds the product",
      headId: undefined,
      color: "#4C6FFF",
      budget: 1_000_000,
    });
  });

  it("maps a populated headId", () => {
    const row: PrismaDepartment = {
      id: "dept-eng",
      tenantId: "novatech",
      name: "Engineering",
      description: "Builds the product",
      headId: "emp-1",
      color: "#4C6FFF",
      budget: new Prisma.Decimal(1_000_000),
    };

    expect(mapDepartment(row).headId).toBe("emp-1");
  });
});

describe("mapLeaveRequest", () => {
  const baseRow: PrismaLeaveRequest = {
    id: "leave-1",
    tenantId: "novatech",
    employeeId: "emp-1",
    type: "annual",
    startDate: new Date("2026-07-01T00:00:00Z"),
    endDate: new Date("2026-07-05T00:00:00Z"),
    days: 5,
    daySelections: null,
    reason: "Family vacation",
    documentUrl: null,
    status: "pending",
    appliedOn: new Date("2026-06-15T00:00:00Z"),
    decisionNote: null,
    decidedBy: null,
    decidedOn: null,
  };

  it("maps a pending request with no decision fields", () => {
    const leaveRequest = mapLeaveRequest(baseRow);

    expect(leaveRequest.startDate).toBe("2026-07-01");
    expect(leaveRequest.endDate).toBe("2026-07-05");
    expect(leaveRequest.appliedOn).toBe("2026-06-15");
    expect(leaveRequest.decisionNote).toBeUndefined();
    expect(leaveRequest.decidedBy).toBeUndefined();
    expect(leaveRequest.decidedOn).toBeUndefined();
  });

  it("maps a decided request", () => {
    const row: PrismaLeaveRequest = {
      ...baseRow,
      status: "approved",
      decisionNote: "Enjoy!",
      decidedBy: "Thabo Nkosi",
      decidedOn: new Date("2026-06-16T00:00:00Z"),
    };

    const leaveRequest = mapLeaveRequest(row);

    expect(leaveRequest.status).toBe("approved");
    expect(leaveRequest.decisionNote).toBe("Enjoy!");
    expect(leaveRequest.decidedBy).toBe("Thabo Nkosi");
    expect(leaveRequest.decidedOn).toBe("2026-06-16");
  });
});

describe("mapPayslip", () => {
  it("casts earnings and deductions back to line items", () => {
    const row: PrismaPayslip = {
      id: "run-2026-01-emp-1",
      tenantId: "novatech",
      runId: "run-2026-01",
      employeeId: "emp-1",
      period: "2026-01",
      payDate: new Date("2026-01-25T00:00:00Z"),
      basicSalary: new Prisma.Decimal(50_000),
      earnings: [{ label: "Travel Allowance", amount: 3_000 }],
      deductions: [{ label: "PAYE (Income Tax)", amount: 11_302.67 }],
      grossPay: new Prisma.Decimal(53_000),
      totalDeductions: new Prisma.Decimal(11_302.67),
      netPay: new Prisma.Decimal(41_697.33),
      paye: new Prisma.Decimal(11_302.67),
      uif: new Prisma.Decimal(177.12),
    };

    expect(mapPayslip(row)).toEqual({
      id: "run-2026-01-emp-1",
      tenantId: "novatech",
      runId: "run-2026-01",
      employeeId: "emp-1",
      period: "2026-01",
      payDate: "2026-01-25",
      basicSalary: 50_000,
      earnings: [{ label: "Travel Allowance", amount: 3_000 }],
      deductions: [{ label: "PAYE (Income Tax)", amount: 11_302.67 }],
      grossPay: 53_000,
      totalDeductions: 11_302.67,
      netPay: 41_697.33,
      paye: 11_302.67,
      uif: 177.12,
    });
  });
});

describe("mapPayrollRun", () => {
  const baseRow: PrismaPayrollRun = {
    id: "novatech-run-2026-06",
    tenantId: "novatech",
    period: "2026-06",
    label: "June 2026",
    payDate: new Date("2026-06-25T00:00:00Z"),
    status: "scheduled",
    totalGross: new Prisma.Decimal(0),
    totalDeductions: new Prisma.Decimal(0),
    totalNet: new Prisma.Decimal(0),
    totalPaye: new Prisma.Decimal(0),
    totalUif: new Prisma.Decimal(0),
    employeeCount: 12,
    processedOn: null,
    approvedBy: null,
    approvedAt: null,
    approvalNote: null,
  };

  it("maps an unprocessed run with no processedOn timestamp", () => {
    const run = mapPayrollRun(baseRow, []);
    expect(run.processedOn).toBeUndefined();
    expect(run.payslipIds).toEqual([]);
    expect(run.payDate).toBe("2026-06-25");
  });

  it("maps a processed run with payslip ids and processedOn", () => {
    const row: PrismaPayrollRun = {
      ...baseRow,
      status: "completed",
      processedOn: new Date("2026-06-25T08:00:00.000Z"),
    };

    const run = mapPayrollRun(row, ["novatech-run-2026-06-emp-1", "novatech-run-2026-06-emp-2"]);

    expect(run.processedOn).toBe("2026-06-25T08:00:00.000Z");
    expect(run.payslipIds).toEqual(["novatech-run-2026-06-emp-1", "novatech-run-2026-06-emp-2"]);
  });
});

describe("mapActivityItem", () => {
  it("maps a null employeeId to undefined", () => {
    const row: PrismaActivityItem = {
      id: "activity-1",
      tenantId: "novatech",
      type: "payroll_run",
      message: "processed payroll for June 2026",
      actor: "Lerato Mokoena",
      employeeId: null,
      timestamp: new Date("2026-06-25T08:00:00.000Z"),
    };

    const activity = mapActivityItem(row);
    expect(activity.employeeId).toBeUndefined();
    expect(activity.timestamp).toBe("2026-06-25T08:00:00.000Z");
  });

  it("maps a populated employeeId", () => {
    const row: PrismaActivityItem = {
      id: "activity-2",
      tenantId: "novatech",
      type: "hire",
      message: "joined as Software Engineer",
      actor: "Lerato Mokoena",
      employeeId: "emp-1",
      timestamp: new Date("2026-06-25T08:00:00.000Z"),
    };

    expect(mapActivityItem(row).employeeId).toBe("emp-1");
  });
});

describe("mapNotificationItem", () => {
  it("maps a notification row to the app type", () => {
    const row: PrismaNotificationItem = {
      id: "notif-1",
      tenantId: "novatech",
      title: "Payslips published",
      description: "June 2026 payslips are ready to view.",
      timestamp: new Date("2026-06-25T08:00:00.000Z"),
      read: false,
      type: "success",
      audienceRole: "hr",
      recipientEmployeeId: null,
    };

    expect(mapNotificationItem(row)).toEqual({
      id: "notif-1",
      tenantId: "novatech",
      title: "Payslips published",
      description: "June 2026 payslips are ready to view.",
      timestamp: "2026-06-25T08:00:00.000Z",
      read: false,
      type: "success",
    });
  });
});
