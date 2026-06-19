"use server";

import { runAsTenant } from "@/lib/db-context";

export async function markNotificationReadRecord(tenantId: string, id: string): Promise<void> {
  await runAsTenant(tenantId, async (tx) => {
    await tx.notificationItem.update({ where: { id }, data: { read: true } });
  });
}

export async function markAllNotificationsReadRecord(tenantId: string): Promise<void> {
  await runAsTenant(tenantId, async (tx) => {
    await tx.notificationItem.updateMany({
      where: { tenantId, read: false },
      data: { read: true },
    });
  });
}
