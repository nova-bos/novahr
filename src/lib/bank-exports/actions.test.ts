import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  payrollRun: { findFirst: vi.fn() },
  payslip: { findMany: vi.fn() },
  bankExport: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  activityItem: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

const mockSession = vi.hoisted(() => ({
  current: { id: "user-1", tenantId: "novatech", role: "hr", name: "Lerato Dlamini", email: "hr@novatech.co.za" },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));

const netcashMocks = vi.hoisted(() => ({
  submitNifBatch: vi.fn(),
}));

vi.mock("@/lib/bank-exports/netcash", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./netcash")>();
  return { ...actual, submitNifBatch: netcashMocks.submitNifBatch };
});

vi.mock("@/lib/settings/netcash-keys", () => ({
  getNetcashServiceKeys: vi.fn(async () => ({
    salaryKey: "7f9c2b4e-1a3d-4c5f-8e6a-9b0d1c2e3f4a",
    accountServicesKey: null,
    instruction: "DatedSalaries",
    environment: "production" as const,
  })),
}));

import { submitNetcashBatchAction } from "./actions";

const RUN = {
  id: "run-1",
  tenantId: "novatech",
  period: "2026-06",
  payDate: new Date("2026-06-25T00:00:00Z"),
};

const PAYSLIPS = [
  {
    netPay: 25_000,
    employee: {
      employeeNumber: "EMP-0001",
      firstName: "Thandi",
      lastName: "Nkosi",
      bankAccountNumber: "62123456789",
      bankBranchCode: "250655",
      bankAccountType: "Cheque",
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.payrollRun.findFirst.mockResolvedValue(RUN);
  mockPrisma.payslip.findMany.mockResolvedValue(PAYSLIPS);
  mockPrisma.bankExport.create.mockResolvedValue({ id: "ledger-1" });
  mockPrisma.bankExport.update.mockResolvedValue({});
  mockPrisma.activityItem.create.mockResolvedValue({});
});

describe("submitNetcashBatchAction idempotency", () => {
  it("submits and records an exported ledger row on success", async () => {
    mockPrisma.bankExport.findFirst.mockResolvedValue(null);
    netcashMocks.submitNifBatch.mockResolvedValue({ token: "TOKEN-123" });

    const result = await submitNetcashBatchAction("novatech", "run-1");

    expect(result.token).toBe("TOKEN-123");
    expect(mockPrisma.bankExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "novatech",
        payrollRunId: "run-1",
        status: "pending",
        fileFormat: "nif",
        paymentCount: 1,
      }),
    });
    expect(mockPrisma.bankExport.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: expect.objectContaining({ status: "exported" }),
    });
  });

  it("refuses to submit a run that was already exported", async () => {
    mockPrisma.bankExport.findFirst.mockResolvedValue({
      id: "ledger-0",
      status: "exported",
      exportedAt: new Date("2026-06-24T10:00:00Z"),
      createdAt: new Date("2026-06-24T10:00:00Z"),
    });

    const result = await submitNetcashBatchAction("novatech", "run-1");

    expect(result.token).toBe("");
    expect(result.error).toContain("already submitted");
    expect(netcashMocks.submitNifBatch).not.toHaveBeenCalled();
    expect(mockPrisma.bankExport.create).not.toHaveBeenCalled();
  });

  it("refuses while a fresh submission is in flight", async () => {
    mockPrisma.bankExport.findFirst.mockResolvedValue({
      id: "ledger-0",
      status: "pending",
      exportedAt: null,
      createdAt: new Date(),
    });

    const result = await submitNetcashBatchAction("novatech", "run-1");

    expect(result.error).toContain("already in progress");
    expect(netcashMocks.submitNifBatch).not.toHaveBeenCalled();
  });

  it("releases a stale pending claim and proceeds", async () => {
    mockPrisma.bankExport.findFirst.mockResolvedValue({
      id: "ledger-0",
      status: "pending",
      exportedAt: null,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    });
    netcashMocks.submitNifBatch.mockResolvedValue({ token: "TOKEN-456" });

    const result = await submitNetcashBatchAction("novatech", "run-1");

    expect(result.token).toBe("TOKEN-456");
    expect(mockPrisma.bankExport.update).toHaveBeenCalledWith({
      where: { id: "ledger-0" },
      data: expect.objectContaining({ status: "cancelled" }),
    });
  });

  it("marks the ledger cancelled when Netcash rejects the batch", async () => {
    mockPrisma.bankExport.findFirst.mockResolvedValue(null);
    netcashMocks.submitNifBatch.mockResolvedValue({ token: "", error: "Authentication failure." });

    const result = await submitNetcashBatchAction("novatech", "run-1");

    expect(result.error).toBe("Authentication failure.");
    expect(mockPrisma.bankExport.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: expect.objectContaining({ status: "cancelled" }),
    });
  });
});
