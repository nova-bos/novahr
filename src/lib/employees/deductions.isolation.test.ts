import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression tests for employee deductions (loans and
// garnishees). Assert that reads are tenant-scoped and that a write cannot act
// on another tenant's employee row.

const mockPrisma = vi.hoisted(() => ({
  employeeDeduction: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  employee: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-a",
    tenantId: "tenant-a",
    role: "hr",
    name: "HR Admin",
    email: "hr@tenant-a.co.za",
    employeeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));

import { createEmployeeDeduction, listEmployeeDeductions } from "./deductions";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employeeDeduction.findMany.mockResolvedValue([]);
});

describe("listEmployeeDeductions isolation", () => {
  it("scopes the findMany by the caller's tenantId", async () => {
    await listEmployeeDeductions("emp-1");

    expect(mockPrisma.employeeDeduction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: "emp-1", tenantId: "tenant-a" }),
      })
    );
  });
});

describe("createEmployeeDeduction isolation", () => {
  it("rejects creating a deduction against an employee outside the tenant", async () => {
    // The employee guard is tenant-scoped, so a cross-tenant employeeId resolves
    // to null and no deduction is written.
    mockPrisma.employee.findFirst.mockResolvedValue(null);

    const result = await createEmployeeDeduction({
      employeeId: "emp-from-tenant-b",
      kind: "loan",
      description: "Study loan",
      originalAmount: 5000,
      monthlyAmount: 1000,
    });

    expect(result.error).toBe("Employee not found.");
    // The tenant-scoped guard query must carry the caller's tenantId.
    expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "emp-from-tenant-b", tenantId: "tenant-a" }),
      })
    );
    expect(mockPrisma.employeeDeduction.create).not.toHaveBeenCalled();
  });

  it("stamps the created deduction with the caller's tenantId", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1" });
    mockPrisma.employeeDeduction.create.mockResolvedValue({
      id: "ded-1",
      employeeId: "emp-1",
      kind: "loan",
      description: "Study loan",
      reference: null,
      originalAmount: 5000,
      monthlyAmount: 1000,
      balance: 5000,
      status: "active",
      startDate: new Date("2026-07-01T00:00:00Z"),
      settledAt: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    });

    await createEmployeeDeduction({
      employeeId: "emp-1",
      kind: "loan",
      description: "Study loan",
      originalAmount: 5000,
      monthlyAmount: 1000,
    });

    expect(mockPrisma.employeeDeduction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "tenant-a", employeeId: "emp-1" }),
      })
    );
  });
});
