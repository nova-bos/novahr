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
});

describe("markNotificationReadRecord", () => {
  it("marks the given notification as read", async () => {
    mockPrisma.notificationItem.update.mockResolvedValue({});

    await markNotificationReadRecord("notif-1");

    expect(mockPrisma.notificationItem.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { read: true },
    });
  });
});

describe("markAllNotificationsReadRecord", () => {
  it("marks every unread notification for the tenant as read", async () => {
    mockPrisma.notificationItem.updateMany.mockResolvedValue({ count: 3 });

    await markAllNotificationsReadRecord();

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "novatech", read: false },
      data: { read: true },
    });
  });
});
