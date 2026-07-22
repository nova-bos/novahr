import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const tx = {
    leaveRequest: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn() },
    leaveBalance: { update: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
  };
  return {
    employee: { findFirstOrThrow: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    leaveRequest: { ...tx.leaveRequest, findFirstOrThrow: vi.fn() },
    activityItem: tx.activityItem,
    notificationItem: tx.notificationItem,
    leaveBalance: tx.leaveBalance,
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
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));

import { createLeaveRequestRecord, decideLeaveRequestRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeEmployeeRowMinimal(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    tenantId: "novatech",
    firstName: "Aisha",
    lastName: "Patel",
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
    endDate: new Date("2026-07-07T00:00:00Z"),
    days: 5,
    daySelections: null,
    reason: "Family vacation",
    status: "pending",
    appliedOn: new Date("2026-06-15T00:00:00Z"),
    decisionNote: null,
    decidedBy: null,
    decidedOn: null,
    ...overrides,
  };
}

function makeActivityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "activity-1",
    tenantId: "novatech",
    type: "leave_request",
    message: "requested 5 days of annual leave",
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
    title: "Leave request awaiting approval",
    description: "Aisha Patel requested 5 days of annual leave.",
    timestamp: new Date("2026-06-15T08:00:00Z"),
    read: false,
    type: "warning",
    ...overrides,
  };
}

describe("createLeaveRequestRecord", () => {
  it("uses plural 'days' wording for multi-day requests", async () => {
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.create.mockResolvedValue(makeLeaveRequestRow());
    mockPrisma.activityItem.create.mockResolvedValue(makeActivityRow());
    mockPrisma.notificationItem.create.mockResolvedValue(makeNotificationRow());

    const result = await createLeaveRequestRecord({
      employeeId: "emp-1",
      type: "annual",
      daySelections: [
        { date: "2026-07-01", type: "full" },
        { date: "2026-07-02", type: "full" },
        { date: "2026-07-03", type: "full" },
        { date: "2026-07-06", type: "full" },
        { date: "2026-07-07", type: "full" },
      ],
      reason: "Family vacation",
    });

    expect(result.leaveRequest.id).toBe("leave-1");
    expect(result.activity.message).toBe("requested 5 days of annual leave");
    expect(result.notification.title).toBe("Leave request awaiting approval");
    expect(result.notification.description).toBe("Aisha Patel requested 5 days of annual leave.");

    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: {
        tenantId: "novatech",
        type: "leave_request",
        message: "requested 5 days of annual leave",
        actor: "Aisha Patel",
        employeeId: "emp-1",
      },
    });
  });

  it("uses singular 'day' wording for single-day requests", async () => {
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.create.mockResolvedValue(makeLeaveRequestRow({ days: 1 }));
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ message: "requested 1 day of annual leave" })
    );
    mockPrisma.notificationItem.create.mockResolvedValue(
      makeNotificationRow({ description: "Aisha Patel requested 1 day of annual leave." })
    );

    const result = await createLeaveRequestRecord({
      employeeId: "emp-1",
      type: "annual",
      daySelections: [{ date: "2026-07-01", type: "full" }],
      reason: "Doctor's appointment",
    });

    expect(result.activity.message).toBe("requested 1 day of annual leave");
    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ message: "requested 1 day of annual leave" }),
    });
  });
});

describe("createLeaveRequestRecord validation", () => {
  it("rejects an empty daySelections array", async () => {
    await expect(
      createLeaveRequestRecord({
        employeeId: "emp-1",
        type: "annual",
        daySelections: [],
        reason: "Forgot to select days",
      })
    ).rejects.toThrow("Please select at least one day.");
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });
});

describe("decideLeaveRequestRecord", () => {
  it("approves a request, increments the leave balance, and records activity", async () => {
    // First findFirstOrThrow reads the pending target; the second reads the row
    // back after the compare-and-swap status transition.
    mockPrisma.leaveRequest.findFirstOrThrow
      .mockResolvedValueOnce(makeLeaveRequestRow({ status: "pending" }))
      .mockResolvedValueOnce(
        makeLeaveRequestRow({ status: "approved", decidedBy: "Lerato Dlamini", decidedOn: new Date("2026-06-16T00:00:00Z") })
      );
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({ id: "lb-1", employeeId: "emp-1", type: "annual", total: 18, used: 5 });
    mockPrisma.leaveRequest.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.leaveBalance.upsert.mockResolvedValue({
      id: "lb-1",
      employeeId: "emp-1",
      type: "annual",
      total: 18,
      used: 10,
    });
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_approved", message: "annual leave request was approved" })
    );

    const result = await decideLeaveRequestRecord("leave-1", "approved");

    expect(result.leaveRequest.status).toBe("approved");
    expect(result.leaveBalance).toEqual({ employeeId: "emp-1", type: "annual", used: 10 });
    expect(result.activity.message).toBe("annual leave request was approved");

    expect(mockPrisma.leaveRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "leave-1", tenantId: "novatech", status: "pending" },
      data: {
        status: "approved",
        decidedBy: "Lerato Dlamini",
        decidedOn: expect.any(Date),
        decisionNote: undefined,
      },
    });
    expect(mockPrisma.leaveBalance.upsert).toHaveBeenCalledWith({
      where: { employeeId_type: { employeeId: "emp-1", type: "annual" } },
      update: { used: { increment: 5 } },
      create: { employeeId: "emp-1", type: "annual", total: 18, used: 5 },
    });
    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: {
        tenantId: "novatech",
        type: "leave_approved",
        message: "annual leave request was approved",
        actor: "Aisha Patel",
        employeeId: "emp-1",
      },
    });
  });

  it("blocks approval that would exceed the leave entitlement", async () => {
    mockPrisma.leaveRequest.findFirstOrThrow.mockResolvedValueOnce(makeLeaveRequestRow({ status: "pending", days: 5 }));
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    // 16 of 18 used, approving 5 more would exceed the entitlement.
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({ id: "lb-1", employeeId: "emp-1", type: "annual", total: 18, used: 16 });

    await expect(decideLeaveRequestRecord("leave-1", "approved")).rejects.toThrow(/exceed the employee's annual leave entitlement/);
    expect(mockPrisma.leaveRequest.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.leaveBalance.upsert).not.toHaveBeenCalled();
  });

  it("rejects a request without touching the leave balance", async () => {
    mockPrisma.leaveRequest.findFirstOrThrow
      .mockResolvedValueOnce(makeLeaveRequestRow({ status: "pending" }))
      .mockResolvedValueOnce(
        makeLeaveRequestRow({ status: "rejected", decidedBy: "Lerato Dlamini", decidedOn: new Date("2026-06-16T00:00:00Z") })
      );
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveRequest.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_rejected", message: "annual leave request was rejected" })
    );

    const result = await decideLeaveRequestRecord("leave-1", "rejected");

    expect(result.leaveRequest.status).toBe("rejected");
    expect(result.leaveBalance).toBeUndefined();
    expect(result.activity.message).toBe("annual leave request was rejected");
    expect(mockPrisma.leaveBalance.upsert).not.toHaveBeenCalled();
  });

  it("passes the decision note through to the compare-and-swap update", async () => {
    mockPrisma.leaveRequest.findFirstOrThrow
      .mockResolvedValueOnce(makeLeaveRequestRow({ status: "pending" }))
      .mockResolvedValueOnce(
        makeLeaveRequestRow({ status: "rejected", decidedBy: "Lerato Dlamini", decisionNote: "Team is short-staffed that week" })
      );
    mockPrisma.employee.findFirstOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveRequest.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_rejected", message: "annual leave request was rejected" })
    );

    await decideLeaveRequestRecord("leave-1", "rejected", "Team is short-staffed that week");

    expect(mockPrisma.leaveRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "leave-1", tenantId: "novatech", status: "pending" },
      data: {
        status: "rejected",
        decidedBy: "Lerato Dlamini",
        decidedOn: expect.any(Date),
        decisionNote: "Team is short-staffed that week",
      },
    });
  });
});
