import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const tx = {
    leaveRequest: { create: vi.fn(), update: vi.fn() },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn() },
    leaveBalance: { update: vi.fn() },
  };
  return {
    employee: { findUniqueOrThrow: vi.fn() },
    leaveRequest: { ...tx.leaveRequest, findUniqueOrThrow: vi.fn() },
    activityItem: tx.activityItem,
    notificationItem: tx.notificationItem,
    leaveBalance: tx.leaveBalance,
    $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

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
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.create.mockResolvedValue(makeLeaveRequestRow());
    mockPrisma.activityItem.create.mockResolvedValue(makeActivityRow());
    mockPrisma.notificationItem.create.mockResolvedValue(makeNotificationRow());

    const result = await createLeaveRequestRecord({
      tenantId: "novatech",
      employeeId: "emp-1",
      type: "annual",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      days: 5,
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
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.create.mockResolvedValue(makeLeaveRequestRow({ days: 1 }));
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ message: "requested 1 day of annual leave" })
    );
    mockPrisma.notificationItem.create.mockResolvedValue(
      makeNotificationRow({ description: "Aisha Patel requested 1 day of annual leave." })
    );

    const result = await createLeaveRequestRecord({
      tenantId: "novatech",
      employeeId: "emp-1",
      type: "annual",
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      days: 1,
      reason: "Doctor's appointment",
    });

    expect(result.activity.message).toBe("requested 1 day of annual leave");
    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ message: "requested 1 day of annual leave" }),
    });
  });
});

describe("decideLeaveRequestRecord", () => {
  it("approves a request, increments the leave balance, and records activity", async () => {
    mockPrisma.leaveRequest.findUniqueOrThrow.mockResolvedValue(makeLeaveRequestRow({ status: "pending" }));
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.update.mockResolvedValue(
      makeLeaveRequestRow({ status: "approved", decidedBy: "Lerato Dlamini", decidedOn: new Date("2026-06-16T00:00:00Z") })
    );
    mockPrisma.leaveBalance.update.mockResolvedValue({
      id: "lb-1",
      employeeId: "emp-1",
      type: "annual",
      total: 18,
      used: 5,
    });
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_approved", message: "annual leave request was approved" })
    );

    const result = await decideLeaveRequestRecord("leave-1", "approved", "Lerato Dlamini");

    expect(result.leaveRequest.status).toBe("approved");
    expect(result.leaveBalance).toEqual({ employeeId: "emp-1", type: "annual", used: 5 });
    expect(result.activity.message).toBe("annual leave request was approved");

    expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: {
        status: "approved",
        decidedBy: "Lerato Dlamini",
        decidedOn: expect.any(Date),
        decisionNote: undefined,
      },
    });
    expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith({
      where: { employeeId_type: { employeeId: "emp-1", type: "annual" } },
      data: { used: { increment: 5 } },
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

  it("rejects a request without touching the leave balance", async () => {
    mockPrisma.leaveRequest.findUniqueOrThrow.mockResolvedValue(makeLeaveRequestRow({ status: "pending" }));
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.update.mockResolvedValue(
      makeLeaveRequestRow({ status: "rejected", decidedBy: "Lerato Dlamini", decidedOn: new Date("2026-06-16T00:00:00Z") })
    );
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_rejected", message: "annual leave request was rejected" })
    );

    const result = await decideLeaveRequestRecord("leave-1", "rejected", "Lerato Dlamini");

    expect(result.leaveRequest.status).toBe("rejected");
    expect(result.leaveBalance).toBeUndefined();
    expect(result.activity.message).toBe("annual leave request was rejected");
    expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
  });

  it("passes the decision note through to the update", async () => {
    mockPrisma.leaveRequest.findUniqueOrThrow.mockResolvedValue(makeLeaveRequestRow({ status: "pending" }));
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(makeEmployeeRowMinimal());
    mockPrisma.leaveRequest.update.mockResolvedValue(
      makeLeaveRequestRow({ status: "rejected", decidedBy: "Lerato Dlamini", decisionNote: "Team is short-staffed that week" })
    );
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "leave_rejected", message: "annual leave request was rejected" })
    );

    await decideLeaveRequestRecord("leave-1", "rejected", "Lerato Dlamini", "Team is short-staffed that week");

    expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: "leave-1" },
      data: {
        status: "rejected",
        decidedBy: "Lerato Dlamini",
        decidedOn: expect.any(Date),
        decisionNote: "Team is short-staffed that week",
      },
    });
  });
});
