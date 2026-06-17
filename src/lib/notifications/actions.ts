"use server";

import { prisma } from "@/lib/prisma";

export async function markNotificationReadRecord(id: string): Promise<void> {
  await prisma.notificationItem.update({ where: { id }, data: { read: true } });
}

export async function markAllNotificationsReadRecord(tenantId: string): Promise<void> {
  await prisma.notificationItem.updateMany({
    where: { tenantId, read: false },
    data: { read: true },
  });
}
