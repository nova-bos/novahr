import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmployeeRow, makeTenantRow } from "../workspace/test-fixtures";

const mockPrisma = vi.hoisted(() => {
  const tx = {
    payslip: { createMany: vi.fn() },
    payrollItem: { createMany: vi.fn() },
    payrollSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    payrollRun: { update: vi.fn(), create: vi.fn() },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn(), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    employeeDeduction: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  };
  return {
    payrollRun: { ...tx.payrollRun, findFirstOrThrow: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    payslip: { ...tx.payslip, findMany: vi.fn() },
    payrollItem: tx.payrollItem,
    payrollSettings: tx.payrollSettings,
    tenant: { findUniqueOrThrow: vi.fn() },
    employee: { findMany: vi.fn() },
    payrollProfile: { findMany: vi.fn().mockResolvedValue([]) },
    payrollInput: { findMany: vi.fn().mockResolvedValue([]) },
    leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    employeeDeduction: tx.employeeDeduction,
    activityItem: tx.activityItem,
    notificationItem: tx.notificationItem,
    $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
    employeeId: undefined as string | undefined,
    branchScopeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));


import { completePayrollRunRecord, setPayrollRunBranchAction, startPayrollRunRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the acting session to a full-access HR admin (no branch scope).
  mockSession.current = {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
    employeeId: undefined,
    branchScopeId: undefined,
  };
});

function makePayrollRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "novatech-run-2026-06",
    tenantId: "novatech",
    period: "2026-06",
    label: "June 2026 Payroll",
    payDate: new Date("2026-06-25T00:00:00Z"),
    status: "processing",
    totalGross: new Prisma.Decimal(0),
    totalDeductions: new Prisma.Decimal(0),
    totalNet: new Prisma.Decimal(0),
    totalPaye: new Prisma.Decimal(0),
    totalUif: new Prisma.Decimal(0),
    employeeCount: 0,
    processedOn: null,
    ...overrides,
  };
}

describe("startPayrollRunRecord", () => {
  it("marks the run as processing and returns its current payslip ids", async () => {
    mockPrisma.payrollRun.findFirst.mockResolvedValue({ id: "novatech-run-2026-06" });
    mockPrisma.payrollRun.update.mockResolvedValue(makePayrollRunRow({ status: "processing" }));
    mockPrisma.payslip.findMany.mockResolvedValue([
      { id: "novatech-run-2026-06-emp-1" },
      { id: "novatech-run-2026-06-emp-2" },
    ]);

    const result = await startPayrollRunRecord("novatech-run-2026-06");

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
      salaryAnnualGross: new Prisma.Decimal(600_000),
    });
    const terminatedEmployee = makeEmployeeRow({
      id: "emp-2",
      status: "terminated",
      salaryAnnualGross: new Prisma.Decimal(500_000),
    });

    mockPrisma.payrollRun.findFirstOrThrow.mockResolvedValue(run);
    mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue(tenant);
    mockPrisma.employee.findMany.mockResolvedValue([eligibleEmployee, terminatedEmployee]);

    return { run, tenant, eligibleEmployee, terminatedEmployee };
  }

  it("refuses to re-complete an already-processed run (no double deduction)", async () => {
    // A completed run must not be reprocessed: doing so would recompute and
    // re-apply recurring deductions, taking loan/garnishee instalments twice.
    mockPrisma.payrollRun.findFirstOrThrow.mockResolvedValue(makePayrollRunRow({ status: "completed" }));

    await expect(completePayrollRunRecord("novatech-run-2026-06")).rejects.toThrow(
      /already been processed/
    );
    expect(mockPrisma.payrollRun.update).not.toHaveBeenCalled();
    expect(mockPrisma.payslip.createMany).not.toHaveBeenCalled();
  });

  it("refuses to complete a run awaiting approval", async () => {
    mockPrisma.payrollRun.findFirstOrThrow.mockResolvedValue(makePayrollRunRow({ status: "awaiting_approval" }));

    await expect(completePayrollRunRecord("novatech-run-2026-06")).rejects.toThrow(
      /already been processed/
    );
  });

  it("excludes terminated employees, builds payslips, and creates the next scheduled run", async () => {
    setupCommon();
    mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
    mockPrisma.payslip.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.payrollRun.update.mockResolvedValue(
      makePayrollRunRow({
        status: "completed",
        totalGross: new Prisma.Decimal(50_000),
        totalDeductions: new Prisma.Decimal(11_252.70),
        totalNet: new Prisma.Decimal(38_747.30),
        totalPaye: new Prisma.Decimal(11_075.58),
        totalUif: new Prisma.Decimal(177.12),
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

    const result = await completePayrollRunRecord("novatech-run-2026-06");

    expect(result.payrollRun.status).toBe("completed");
    expect(result.payrollRun.totalGross).toBe(50_000);
    expect(result.payslips).toHaveLength(1);
    expect(result.payslips[0].employeeId).toBe("emp-1");
    expect(result.payslips[0].netPay).toBe(38_747.30);
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
          netPay: 38_747.30,
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

  it("recovers a loan instalment from net pay and reduces the balance", async () => {
    setupCommon();
    mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
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
    mockPrisma.payrollRun.create.mockResolvedValue(makePayrollRunRow({ id: "novatech-run-2026-07", period: "2026-07", status: "scheduled" }));
    mockPrisma.employeeDeduction.findMany.mockResolvedValue([
      { id: "ded-1", employeeId: "emp-1", kind: "loan", description: "Study loan", monthlyAmount: 1_000, balance: 5_000, status: "active" },
    ]);

    const result = await completePayrollRunRecord("novatech-run-2026-06");

    // Base net pay for emp-1 is 38,747.30; the R1,000 instalment reduces it.
    expect(result.payslips[0].netPay).toBe(37_747.30);
    expect(result.payslips[0].deductions).toContainEqual({ label: "Study loan", amount: 1_000 });
    // The outstanding balance is reduced and not yet settled.
    expect(mockPrisma.employeeDeduction.update).toHaveBeenCalledWith({
      where: { id: "ded-1" },
      data: { balance: 4_000 },
    });
  });

  it("deducts approved unpaid leave that falls inside the period", async () => {
    setupCommon();
    mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
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
    mockPrisma.payrollRun.create.mockResolvedValue(makePayrollRunRow({ id: "novatech-run-2026-07", period: "2026-07", status: "scheduled" }));
    // Mon 8 to Wed 10 June 2026: 3 working days, all inside the run period.
    mockPrisma.leaveRequest.findMany.mockResolvedValue([
      {
        employeeId: "emp-1",
        startDate: new Date("2026-06-08T00:00:00Z"),
        endDate: new Date("2026-06-10T00:00:00Z"),
      },
    ]);

    const result = await completePayrollRunRecord("novatech-run-2026-06");

    // Basic salary 50,000 over 21 working days: 3 unpaid days = 7,142.86.
    expect(result.payslips[0].deductions).toContainEqual({
      label: "Unpaid Leave",
      amount: 7_142.86,
    });
    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "unpaid", status: "approved" }),
      })
    );
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

    const result = await completePayrollRunRecord("novatech-run-2026-06");

    expect(result.nextRun).toBeUndefined();
    expect(mockPrisma.payrollRun.create).not.toHaveBeenCalled();
  });
});

describe("branch-scoped payroll eligibility", () => {
  // Wire up just enough for completePayrollRunRecord to run to completion so we
  // can inspect the employee.findMany filter it uses for eligibility.
  function setupForRun(run: Record<string, unknown>) {
    const tenant = makeTenantRow({ id: "novatech", payDay: 25 });
    const branchEmployee = makeEmployeeRow({
      id: "emp-cpt",
      status: "active",
      startDate: new Date("2024-01-15T00:00:00Z"),
      branchId: "branch-cpt",
      salaryAnnualGross: new Prisma.Decimal(600_000),
    });
    mockPrisma.payrollRun.findFirstOrThrow.mockResolvedValue(run);
    mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue(tenant);
    mockPrisma.employee.findMany.mockResolvedValue([branchEmployee]);
    mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
    mockPrisma.payslip.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.payrollRun.update.mockResolvedValue(
      makePayrollRunRow({ status: "completed", employeeCount: 1, ...run })
    );
    mockPrisma.payrollRun.create.mockResolvedValue(
      makePayrollRunRow({ id: "novatech-run-2026-07", period: "2026-07", status: "scheduled" })
    );
    mockPrisma.activityItem.create.mockResolvedValue({
      id: "activity-1",
      tenantId: "novatech",
      type: "payroll_run",
      message: "processed payroll for June 2026",
      actor: "Lerato Dlamini",
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
  }

  it("filters eligibility to the run's branch when branchId is set", async () => {
    setupForRun(makePayrollRunRow({ status: "processing", branchId: "branch-cpt" }));

    await completePayrollRunRecord("novatech-run-2026-06");

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "novatech", branchId: "branch-cpt" },
      })
    );
  });

  it("includes all employees (no branch filter) for a null-branch run", async () => {
    setupForRun(makePayrollRunRow({ status: "processing", branchId: null }));

    await completePayrollRunRecord("novatech-run-2026-06");

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "novatech" } })
    );
  });

  it("constrains a branch-scoped admin to their branch on a null-branch run", async () => {
    mockSession.current.branchScopeId = "branch-cpt";
    setupForRun(makePayrollRunRow({ status: "processing", branchId: null }));

    await completePayrollRunRecord("novatech-run-2026-06");

    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "novatech", branchId: "branch-cpt" },
      })
    );
  });
});

describe("setPayrollRunBranchAction", () => {
  it("sets the branch on a scheduled run after validating it belongs to the tenant", async () => {
    mockPrisma.payrollRun.findFirst.mockResolvedValue(
      makePayrollRunRow({ status: "scheduled" })
    );
    (mockPrisma as unknown as { branch: { findFirst: ReturnType<typeof vi.fn> } }).branch = {
      findFirst: vi.fn().mockResolvedValue({ id: "branch-cpt" }),
    };
    mockPrisma.payrollRun.update.mockResolvedValue(
      makePayrollRunRow({ status: "scheduled", branchId: "branch-cpt" })
    );
    mockPrisma.payslip.findMany.mockResolvedValue([]);

    const result = await setPayrollRunBranchAction("novatech-run-2026-06", "branch-cpt");

    expect(result.branchId).toBe("branch-cpt");
    expect(mockPrisma.payrollRun.update).toHaveBeenCalledWith({
      where: { id: "novatech-run-2026-06" },
      data: { branchId: "branch-cpt" },
    });
  });

  it("refuses to change the branch once the run is no longer scheduled", async () => {
    mockPrisma.payrollRun.findFirst.mockResolvedValue(
      makePayrollRunRow({ status: "processing" })
    );

    await expect(
      setPayrollRunBranchAction("novatech-run-2026-06", "branch-cpt")
    ).rejects.toThrow(/before the run is started/);
    expect(mockPrisma.payrollRun.update).not.toHaveBeenCalled();
  });
});
