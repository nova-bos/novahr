import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression tests for SARS compliance reads. These
// actions accept a tenantId from the client, so they must call requireTenant
// (verifying the session belongs to that tenant) and then carry the tenantId
// predicate on every query.

const mockPrisma = vi.hoisted(() => ({
  complianceRecord: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
  },
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

const requireTenant = vi.hoisted(() => vi.fn(async () => mockSession.current));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant,
}));

import { getComplianceRecordsAction, getEmp201Action } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.complianceRecord.findMany.mockResolvedValue([]);
  mockPrisma.complianceRecord.findUnique.mockResolvedValue(null);
});

describe("getComplianceRecordsAction isolation", () => {
  it("verifies tenant membership and scopes the findMany by tenantId", async () => {
    await getComplianceRecordsAction("tenant-a", "2026");

    // The client-supplied tenantId is only trusted after requireTenant.
    expect(requireTenant).toHaveBeenCalledWith("tenant-a", "hr", "exco");
    expect(mockPrisma.complianceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      })
    );
  });
});

describe("getEmp201Action isolation", () => {
  it("scopes the findUnique by the compound tenantId_period_type key", async () => {
    await getEmp201Action("tenant-a", "2026-06");

    expect(requireTenant).toHaveBeenCalledWith("tenant-a", "hr", "exco");
    expect(mockPrisma.complianceRecord.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_period_type: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      })
    );
  });
});
