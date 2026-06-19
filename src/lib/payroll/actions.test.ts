import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmployeeRow, makeTenantRow } from "../workspace/test-fixtures";

const mockPrisma = vi.hoisted(() => {
  const tx = {
    payslip: { createMany: vi.fn() },
    payrollRun: { update: vi.fn(), create: vi.fn() },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn() },
  };
  return {
    payrollRun: { ...tx.payrollRun, findUniqueOrThrow: vi.fn(), findUnique: vi.fn() },
    payslip: { ...tx.payslip, findMany: vi.fn() },
    tenant: { findUniqueOrThrow: vi.fn() },
    employee: { findMany: vi.fn() },
    activityItem: tx.activityItem,
    notificationItem: tx.notificationItem,
    $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

import { completePayrollRunRecord, startPayrollRunRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function makePayrollRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "novatech-run-2026-06",
    tenantId: "novatech",
    period: "2026-06",
    label: "June 2026 Payroll",
    payDate: new Date("2026-06-25T00:00:00Z"),
    status: "processing",
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalPaye: 0,
    totalUif: 0,
    employeeCount: 0,
    processedOn: null,
    ...overrides,
  };
}

describe("startPayrollRunRecord", () => {
  it("marks the run as processing and returns its current payslip ids", async () => {
    mockPrisma.payrollRun.update.mockResolvedValue(makePayrollRunRow({ status: "processing" }));
    mockPrisma.payslip.findMany.mockResolvedValue([
      { id: "novatech-run-2026-06-emp-1" },
      { id: "novatech-run-2026-06-emp-2" },
    ]);

    const result = await startPayrollRunRecord("novatech", "novatech-run-2026-06");

    expect(result.status).toBe("processing");
    expect(result.payslipIds).toEqual(["novatech-run-2026-06-emp-1", "novatech-run-2026-06-emp-2"]);
    expect(mockPrisma.payrollRun.update).toHaveBeenCalledWith({
      where: { id: "novatech-run-2026-06" },
      data: { status: "processing" },
    });
    expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith({ where: { runId: "novatech-run-2026-06" } });
  });
});

describe("completePayrollRunRecord", () => {
  function setupCommon() {
    const run = makePayrollRunRow({ status: "processing" });
    const tenant = makeTenantRow({ id: "novatech", payDay: 25 });
    const eligibleEmployee = makeEmployeeRow({
      id: "emp-1",
      status: "active",
      startDate: new Date("2024-01-15T00:00:00Z"),
      salaryAnnualGross: 600_000,
    });
    const terminatedEmployee = makeEmployeeRow({
      id: "emp-2",
      status: "terminated",
      salaryAnnualGross: 500_000,
    });

    mockPrisma.payrollRun.findUniqueOrThrow.mockResolvedValue(run);
    mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue(tenant);
    mockPrisma.employee.findMany.mockResolvedValue([eligibleEmployee, terminatedEmployee]);

    return { run, tenant, eligibleEmployee, terminatedEmployee };
  }

  it("excludes terminated employees, builds payslips, and creates the next scheduled run", async () => {
    setupCommon();
    mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
    mockPrisma.payslip.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.payrollRun.update.mockResolvedValue(
      makePayrollRunRow({
        status: "completed",
        totalGross: 50_000,
        totalDeductions: 11_479.79,
        totalNet: 38_520.21,
        totalPaye: 11_302.67,
        totalUif: 177.12,
        employeeCount: 1,
        processedOn: new Date("2026-06-25T08:00:00Z"),
      })
    );
    mockPrisma.activityItem.create.mockResolvedValue({
      id: "activity-1",
      tenantId: "novatech",
      type: "payroll_run",
      message: "processed payroll for June 2026",
      actor: "Werner Botha",
      employeeId: null,
      timestamp: new Date("2026-06-25T08:00:00Z"),
    });
    mockPrisma.notificationItem.create.mockResolvedValue({
      id: "notif-1",
      tenantId: "novatech",
      title: "Payslips published",
      description: "June 2026 payslips have been generated for 1 employees.",
      timestamp: new Date("2026-06-25T08:00:00Z"),
      read: false,
      type: "success",
    });
    mockPrisma.payrollRun.create.mockResolvedValue(
      makePayrollRunRow({
        id: "novatech-run-2026-07",
        period: "2026-07",
        label: "July 2026 Payroll",
        payDate: new Date("2026-07-25T00:00:00Z"),
        status: "scheduled",
        employeeCount: 1,
        processedOn: null,
      })
    );

    const result = await completePayrollRunRecord("novatech", "novatech-run-2026-06");

    expect(result.payrollRun.status).toBe("completed");
    expect(result.payrollRun.totalGross).toBe(50_000);
    expect(result.payslips).toHaveLength(1);
    expect(result.payslips[0].employeeId).toBe("emp-1");
    expect(result.payslips[0].netPay).toBe(38_520.21);
    expect(result.activity.message).toBe("processed payroll for June 2026");
    expect(result.activity.actor).toBe("Werner Botha");
    expect(result.notification.description).toBe(
      "June 2026 payslips have been generated for 1 employees."
    );
    expect(result.nextRun?.id).toBe("novatech-run-2026-07");
    expect(result.nextRun?.status).toBe("scheduled");

    expect(mockPrisma.payslip.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        expect.objectContaining({
          id: "novatech-run-2026-06-emp-1",
          employeeId: "emp-1",
          netPay: 38_520.21,
        }),
      ],
    });
    expect(mockPrisma.payrollRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "novatech-run-2026-07",
        tenantId: "novatech",
        period: "2026-07",
        label: "July 2026 Payroll",
        status: "scheduled",
        employeeCount: 1,
      }),
    });
  });

  it("does not create a next run when one already exists", async () => {
    setupCommon();
    mockPrisma.payrollRun.findUnique.mockResolvedValue(makePayrollRunRow({ id: "novatech-run-2026-07", period: "2026-07" }));
    mockPrisma.payslip.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.payrollRun.update.mockResolvedValue(makePayrollRunRow({ status: "completed", employeeCount: 1 }));
    mockPrisma.activityItem.create.mockResolvedValue({
      id: "activity-1",
      tenantId: "novatech",
      type: "payroll_run",
      message: "processed payroll for June 2026",
      actor: "Werner Botha",
      employeeId: null,
      timestamp: new Date("2026-06-25T08:00:00Z"),
    });
    mockPrisma.notificationItem.create.mockResolvedValue({
      id: "notif-1",
      tenantId: "novatech",
      title: "Payslips published",
      description: "June 2026 payslips have been generated for 1 employees.",
      timestamp: new Date("2026-06-25T08:00:00Z"),
      read: false,
      type: "success",
    });

    const result = await completePayrollRunRecord("novatech", "novatech-run-2026-06");

    expect(result.nextRun).toBeUndefined();
    expect(mockPrisma.payrollRun.create).not.toHaveBeenCalled();
  });
});
