import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  notificationItem: { update: vi.fn(), updateMany: vi.fn() },
}));

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


import { markAllNotificationsReadRecord, markNotificationReadRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.current = {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
    employeeId: undefined,
  };
});

describe("markNotificationReadRecord", () => {
  it("marks the given notification as read, scoped to HR-visible notifications", async () => {
    mockPrisma.notificationItem.updateMany.mockResolvedValue({ count: 1 });

    await markNotificationReadRecord("notif-1");

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif-1",
        tenantId: "novatech",
        OR: [{ recipientEmployeeId: null }],
      },
      data: { read: true },
    });
  });

  it("scopes to personal notifications only for an employee user", async () => {
    mockSession.current = { ...mockSession.current, role: "employee", employeeId: "emp-1" };
    mockPrisma.notificationItem.updateMany.mockResolvedValue({ count: 1 });

    await markNotificationReadRecord("notif-1");

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif-1",
        tenantId: "novatech",
        recipientEmployeeId: "emp-1",
      },
      data: { read: true },
    });
  });
});

describe("markAllNotificationsReadRecord", () => {
  it("marks unread notifications visible to the HR user as read", async () => {
    mockPrisma.notificationItem.updateMany.mockResolvedValue({ count: 3 });

    await markAllNotificationsReadRecord();

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: "novatech",
        read: false,
        OR: [{ recipientEmployeeId: null }],
      },
      data: { read: true },
    });
  });

  it("marks only the employee's own notifications as read for an employee user", async () => {
    mockSession.current = { ...mockSession.current, role: "employee", employeeId: "emp-1" };
    mockPrisma.notificationItem.updateMany.mockResolvedValue({ count: 1 });

    await markAllNotificationsReadRecord();

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: "novatech",
        read: false,
        recipientEmployeeId: "emp-1",
      },
      data: { read: true },
    });
  });
});
