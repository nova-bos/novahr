import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmployeeRow, makeTenantRow } from "./test-fixtures";

const mockPrisma = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn(), findMany: vi.fn() },
  employee: { findMany: vi.fn() },
  department: { findMany: vi.fn() },
  leaveRequest: { findMany: vi.fn() },
  payrollRun: { findMany: vi.fn() },
  payrollSettings: { findUnique: vi.fn().mockResolvedValue(null) },
  payslip: { findMany: vi.fn() },
  activityItem: { findMany: vi.fn() },
  notificationItem: { findMany: vi.fn() },
  customHoliday: { findMany: vi.fn().mockResolvedValue([]) },
  leaveReviewer: { findMany: vi.fn().mockResolvedValue([]) },
}));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
    employeeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
}));

import { getAllTenants, getTenantWorkspace } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.current = {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
    employeeId: undefined,
  };
});

function makeDepartmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dept-1",
    tenantId: "novatech",
    name: "Engineering",
    description: "Builds the product",
    headId: null,
    color: "#4C6FFF",
    budget: 1_000_000,
    ...overrides,
  };
}

function makeLeaveRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "leave-1",
    tenantId: "novatech",
    employeeId: "emp-1",
    type: "annual",
    startDate: new Date("2026-07-01T00:00:00Z"),
    endDate: new Date("2026-07-05T00:00:00Z"),
    days: 5,
    reason: "Family vacation",
    status: "pending",
    appliedOn: new Date("2026-06-15T00:00:00Z"),
    decisionNote: null,
    decidedBy: null,
    decidedOn: null,
    ...overrides,
  };
}

function makePayrollRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "novatech-run-2026-05",
    tenantId: "novatech",
    period: "2026-05",
    label: "May 2026 Payroll",
    payDate: new Date("2026-05-25T00:00:00Z"),
    status: "completed",
    totalGross: 50_000,
    totalDeductions: 11_479.79,
    totalNet: 38_520.21,
    totalPaye: 11_302.67,
    totalUif: 177.12,
    employeeCount: 1,
    processedOn: new Date("2026-05-25T08:00:00Z"),
    ...overrides,
  };
}

function makePayslipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "novatech-run-2026-05-emp-1",
    tenantId: "novatech",
    runId: "novatech-run-2026-05",
    employeeId: "emp-1",
    period: "2026-05",
    payDate: new Date("2026-05-25T00:00:00Z"),
    basicSalary: 50_000,
    earnings: [],
    deductions: [
      { label: "PAYE (Income Tax)", amount: 11_302.67 },
      { label: "UIF Contribution", amount: 177.12 },
    ],
    grossPay: 50_000,
    totalDeductions: 11_479.79,
    netPay: 38_520.21,
    paye: 11_302.67,
    uif: 177.12,
    ...overrides,
  };
}

function makeActivityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "activity-1",
    tenantId: "novatech",
    type: "hire",
    message: "joined as Software Engineer",
    actor: "Aisha Patel",
    employeeId: "emp-1",
    timestamp: new Date("2026-06-15T08:00:00Z"),
    ...overrides,
  };
}

function makeNotificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-1",
    tenantId: "novatech",
    title: "New employee added",
    description: "Aisha Patel joined as Software Engineer.",
    timestamp: new Date("2026-06-15T08:00:00Z"),
    read: false,
    type: "info",
    ...overrides,
  };
}

function mockWorkspaceRows(overrides: {
  employees?: unknown[];
  payslips?: unknown[];
  leaveRequests?: unknown[];
  payrollRuns?: unknown[];
} = {}) {
  mockPrisma.tenant.findUnique.mockResolvedValue(makeTenantRow());
  mockPrisma.employee.findMany.mockResolvedValue(overrides.employees ?? [makeEmployeeRow()]);
  mockPrisma.department.findMany.mockResolvedValue([makeDepartmentRow()]);
  mockPrisma.leaveRequest.findMany.mockResolvedValue(overrides.leaveRequests ?? [makeLeaveRequestRow()]);
  mockPrisma.payrollRun.findMany.mockResolvedValue(overrides.payrollRuns ?? [makePayrollRunRow()]);
  mockPrisma.payslip.findMany.mockResolvedValue(overrides.payslips ?? [makePayslipRow()]);
  mockPrisma.activityItem.findMany.mockResolvedValue([makeActivityRow()]);
  mockPrisma.notificationItem.findMany.mockResolvedValue([makeNotificationRow()]);
}

describe("getAllTenants", () => {
  it("returns only the session user's tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(makeTenantRow({ id: "novatech" }));

    const result = await getAllTenants();

    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({ where: { id: "novatech" } });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("novatech");
  });
});

describe("getTenantWorkspace", () => {
  it("returns null when the tenant does not exist", async () => {
    mockWorkspaceRows();
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    const result = await getTenantWorkspace();

    expect(result).toBeNull();
  });

  it("maps every record and groups payslips by run for HR users", async () => {
    mockWorkspaceRows({
      payrollRuns: [
        makePayrollRunRow({ id: "novatech-run-2026-05", period: "2026-05" }),
        makePayrollRunRow({ id: "novatech-run-2026-06", period: "2026-06", status: "scheduled" }),
      ],
      payslips: [
        makePayslipRow({ id: "novatech-run-2026-05-emp-1", runId: "novatech-run-2026-05", employeeId: "emp-1" }),
        makePayslipRow({ id: "novatech-run-2026-05-emp-2", runId: "novatech-run-2026-05", employeeId: "emp-2" }),
        makePayslipRow({ id: "novatech-run-2026-06-emp-1", runId: "novatech-run-2026-06", employeeId: "emp-1" }),
      ],
    });

    const result = await getTenantWorkspace();

    expect(result).not.toBeNull();
    expect(result!.currentTenant.id).toBe("novatech");
    expect(result!.employees).toHaveLength(1);
    expect(result!.employees[0].id).toBe("emp-1");
    expect(result!.employees[0].salary.annualGross).toBeGreaterThan(0);
    expect(result!.departments).toHaveLength(1);
    expect(result!.leaveRequests).toHaveLength(1);
    expect(result!.payslips).toHaveLength(3);

    const runMay = result!.payrollRuns.find((r) => r.id === "novatech-run-2026-05");
    const runJune = result!.payrollRuns.find((r) => r.id === "novatech-run-2026-06");
    expect(runMay?.payslipIds).toEqual(["novatech-run-2026-05-emp-1", "novatech-run-2026-05-emp-2"]);
    expect(runJune?.payslipIds).toEqual(["novatech-run-2026-06-emp-1"]);
  });

  it("sanitizes other employees' pay, banking and identifiers for employee-role users", async () => {
    mockSession.current.role = "employee";
    mockSession.current.employeeId = "emp-1";

    mockWorkspaceRows({
      employees: [
        makeEmployeeRow({ id: "emp-1" }),
        makeEmployeeRow({ id: "emp-2", firstName: "Sipho", lastName: "Nkosi" }),
      ],
      payslips: [
        makePayslipRow({ id: "ps-1", employeeId: "emp-1" }),
        makePayslipRow({ id: "ps-2", employeeId: "emp-2" }),
      ],
      leaveRequests: [
        makeLeaveRequestRow({ id: "leave-1", employeeId: "emp-1" }),
        makeLeaveRequestRow({ id: "leave-2", employeeId: "emp-2" }),
      ],
    });

    const result = await getTenantWorkspace();

    const self = result!.employees.find((e) => e.id === "emp-1")!;
    const other = result!.employees.find((e) => e.id === "emp-2")!;

    expect(self.salary.annualGross).toBeGreaterThan(0);
    expect(other.salary.annualGross).toBe(0);
    expect(other.bankDetails.accountNumber).toBe("");
    expect(other.idNumber).toBe("");
    expect(other.taxNumber).toBe("");
    expect(other.leaveBalances).toEqual([]);

    expect(result!.payslips.map((p) => p.id)).toEqual(["ps-1"]);
    expect(result!.leaveRequests.map((r) => r.id)).toEqual(["leave-1"]);
    expect(result!.payrollRuns[0].totalGross).toBe(0);
  });

  it("keeps direct reports visible but sanitized colleagues hidden for managers", async () => {
    mockSession.current.role = "manager";
    mockSession.current.employeeId = "emp-1";

    mockWorkspaceRows({
      employees: [
        makeEmployeeRow({ id: "emp-1" }),
        makeEmployeeRow({ id: "emp-2", managerId: "emp-1" }),
        makeEmployeeRow({ id: "emp-3", managerId: "someone-else" }),
      ],
      leaveRequests: [
        makeLeaveRequestRow({ id: "leave-1", employeeId: "emp-2" }),
        makeLeaveRequestRow({ id: "leave-2", employeeId: "emp-3" }),
      ],
    });

    const result = await getTenantWorkspace();

    const report = result!.employees.find((e) => e.id === "emp-2")!;
    const outsider = result!.employees.find((e) => e.id === "emp-3")!;

    expect(report.salary.annualGross).toBeGreaterThan(0);
    expect(outsider.salary.annualGross).toBe(0);
    expect(result!.leaveRequests.map((r) => r.id)).toEqual(["leave-1"]);
  });
});
