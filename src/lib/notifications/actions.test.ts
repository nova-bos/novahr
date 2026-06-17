import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  notificationItem: { update: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

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

    await markAllNotificationsReadRecord("novatech");

    expect(mockPrisma.notificationItem.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "novatech", read: false },
      data: { read: true },
    });
  });
});
