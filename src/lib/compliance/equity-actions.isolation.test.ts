import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression test for the Employment Equity report.
// The report must only ever aggregate the caller's own workforce.

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
    update: vi.fn(),
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

const requireTenant = vi.hoisted(() => vi.fn(async () => mockSession.current));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant,
}));

import { getEmploymentEquityReportAction } from "./equity-actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employee.findMany.mockResolvedValue([]);
});

describe("getEmploymentEquityReportAction isolation", () => {
  it("verifies tenant membership and scopes the employee findMany by tenantId", async () => {
    await getEmploymentEquityReportAction("tenant-a");

    expect(requireTenant).toHaveBeenCalledWith("tenant-a", "hr", "exco");
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      })
    );
  });
});
