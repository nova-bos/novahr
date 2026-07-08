import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression test for leave decisions. Deciding a leave
// request must look the row up with a tenantId predicate so an HR user can
// never approve or reject another tenant's request.

const mockPrisma = vi.hoisted(() => ({
  leaveRequest: {
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  employee: { findFirstOrThrow: vi.fn() },
  leaveBalance: { upsert: vi.fn() },
  activityItem: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/email", () => ({
  sendLeaveRequestEmail: vi.fn(),
  sendLeaveDecisionEmail: vi.fn(),
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

import { decideLeaveRequestRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("decideLeaveRequestRecord isolation", () => {
  it("looks the request up with a tenantId predicate and cannot decide a foreign request", async () => {
    // A leave request from another tenant is not found under the caller's
    // tenantId, so findFirstOrThrow throws and no decision is written.
    mockPrisma.leaveRequest.findFirstOrThrow.mockRejectedValue(new Error("No LeaveRequest found"));

    await expect(decideLeaveRequestRecord("lr-from-tenant-b", "approved")).rejects.toThrow();

    expect(mockPrisma.leaveRequest.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "lr-from-tenant-b", tenantId: "tenant-a" }),
      })
    );
    expect(mockPrisma.leaveRequest.update).not.toHaveBeenCalled();
  });
});
