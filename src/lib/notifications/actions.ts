"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireUser } from "@/lib/auth/require";

export async function markNotificationReadRecord(id: string): Promise<void> {
  const session = await requireUser();
  await runAsTenant(session.tenantId, async (tx) => {
    await tx.notificationItem.update({ where: { id }, data: { read: true } });
  });
}

export async function markAllNotificationsReadRecord(): Promise<void> {
  const session = await requireUser();
  await runAsTenant(session.tenantId, async (tx) => {
    await tx.notificationItem.updateMany({
      where: { tenantId: session.tenantId, read: false },
      data: { read: true },
    });
  });
}
