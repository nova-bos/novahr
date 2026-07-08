import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression tests for employee record actions. Covers a
// tenant-scoped read (salary history) and a check-then-act write where the
// tenant guard must prevent editing another tenant's employee.

const mockPrisma = vi.hoisted(() => ({
  employeeSalaryHistory: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  employee: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  activityItem: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

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
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));

import { getSalaryHistoryAction, updateEmployeeRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employeeSalaryHistory.findMany.mockResolvedValue([]);
});

describe("getSalaryHistoryAction isolation", () => {
  it("scopes the salary history findMany by the caller's tenantId", async () => {
    await getSalaryHistoryAction("emp-1");

    expect(mockPrisma.employeeSalaryHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: "emp-1", tenantId: "tenant-a" }),
      })
    );
  });
});

describe("updateEmployeeRecord isolation", () => {
  it("refuses to update an employee that belongs to another tenant", async () => {
    // The tenant-scoped existence guard resolves to null for a foreign id, so
    // the update never runs against another tenant's row.
    mockPrisma.employee.findFirst.mockResolvedValue(null);

    await expect(updateEmployeeRecord("emp-from-tenant-b", { jobTitle: "Hacker" })).rejects.toThrow(
      "Employee not found."
    );

    expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "emp-from-tenant-b", tenantId: "tenant-a" }),
      })
    );
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });
});
