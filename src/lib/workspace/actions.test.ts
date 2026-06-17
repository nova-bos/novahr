import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmployeeRow, makeTenantRow } from "./test-fixtures";

const mockPrisma = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn(), findMany: vi.fn() },
  employee: { findMany: vi.fn() },
  department: { findMany: vi.fn() },
  leaveRequest: { findMany: vi.fn() },
  payrollRun: { findMany: vi.fn() },
  payslip: { findMany: vi.fn() },
  activityItem: { findMany: vi.fn() },
  notificationItem: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { getAllTenants, getTenantWorkspace } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
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

describe("getAllTenants", () => {
  it("queries all tenants ordered by name and maps each row", async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([
      makeTenantRow({ id: "t-1", name: "Alpha Corp" }),
      makeTenantRow({ id: "t-2", name: "Beta Ltd" }),
    ]);

    const result = await getAllTenants();

    expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("t-1");
    expect(result[0].name).toBe("Alpha Corp");
    expect(result[1].id).toBe("t-2");
    expect(result[1].name).toBe("Beta Ltd");
  });
});

describe("getTenantWorkspace", () => {
  it("returns null when the tenant does not exist", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.department.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
    mockPrisma.payrollRun.findMany.mockResolvedValue([]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);
    mockPrisma.activityItem.findMany.mockResolvedValue([]);
    mockPrisma.notificationItem.findMany.mockResolvedValue([]);

    const result = await getTenantWorkspace("does-not-exist");

    expect(result).toBeNull();
  });

  it("maps every record and groups payslips by run", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(makeTenantRow());
    mockPrisma.employee.findMany.mockResolvedValue([makeEmployeeRow()]);
    mockPrisma.department.findMany.mockResolvedValue([makeDepartmentRow()]);
    mockPrisma.leaveRequest.findMany.mockResolvedValue([makeLeaveRequestRow()]);
    mockPrisma.payrollRun.findMany.mockResolvedValue([
      makePayrollRunRow({ id: "novatech-run-2026-05", period: "2026-05" }),
      makePayrollRunRow({ id: "novatech-run-2026-06", period: "2026-06", status: "scheduled" }),
    ]);
    mockPrisma.payslip.findMany.mockResolvedValue([
      makePayslipRow({ id: "novatech-run-2026-05-emp-1", runId: "novatech-run-2026-05", employeeId: "emp-1" }),
      makePayslipRow({ id: "novatech-run-2026-05-emp-2", runId: "novatech-run-2026-05", employeeId: "emp-2" }),
      makePayslipRow({ id: "novatech-run-2026-06-emp-1", runId: "novatech-run-2026-06", employeeId: "emp-1" }),
    ]);
    mockPrisma.activityItem.findMany.mockResolvedValue([makeActivityRow()]);
    mockPrisma.notificationItem.findMany.mockResolvedValue([makeNotificationRow()]);

    const result = await getTenantWorkspace("novatech");

    expect(result).not.toBeNull();
    expect(result!.currentTenant.id).toBe("novatech");
    expect(result!.employees).toHaveLength(1);
    expect(result!.employees[0].id).toBe("emp-1");
    expect(result!.departments).toHaveLength(1);
    expect(result!.departments[0].id).toBe("dept-1");
    expect(result!.leaveRequests).toHaveLength(1);
    expect(result!.payslips).toHaveLength(3);
    expect(result!.activity).toHaveLength(1);
    expect(result!.notifications).toHaveLength(1);

    const runMay = result!.payrollRuns.find((r) => r.id === "novatech-run-2026-05");
    const runJune = result!.payrollRuns.find((r) => r.id === "novatech-run-2026-06");
    expect(runMay?.payslipIds).toEqual(["novatech-run-2026-05-emp-1", "novatech-run-2026-05-emp-2"]);
    expect(runJune?.payslipIds).toEqual(["novatech-run-2026-06-emp-1"]);
  });
});
