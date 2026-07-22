"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireUser } from "@/lib/auth/require";

export async function markNotificationReadRecord(id: string): Promise<void> {
  const session = await requireUser();
  await runAsTenant(session.tenantId, async (tx) => {
    // Guard: only allow marking a notification the user can actually see.
    await tx.notificationItem.updateMany({
      where: { id, tenantId: session.tenantId, ...visibleToUser(session) },
      data: { read: true },
    });
  });
}

export async function markNotificationUnreadRecord(id: string): Promise<void> {
  const session = await requireUser();
  await runAsTenant(session.tenantId, async (tx) => {
    await tx.notificationItem.updateMany({
      where: { id, tenantId: session.tenantId, ...visibleToUser(session) },
      data: { read: false },
    });
  });
}

export async function markAllNotificationsReadRecord(): Promise<void> {
  const session = await requireUser();
  await runAsTenant(session.tenantId, async (tx) => {
    // Only mark the notifications this user is allowed to see.
    const scopeFilter = visibleToUser(session);
    await tx.notificationItem.updateMany({
      where: { tenantId: session.tenantId, read: false, ...scopeFilter },
      data: { read: true },
    });
  });
}

// Returns a Prisma where fragment that restricts a query to notifications
// visible to the given session, mirroring the logic in getTenantWorkspace.
function visibleToUser(session: {
  role: string;
  employeeId?: string | null;
}): Prisma.NotificationItemWhereInput {
  const isPrivileged = session.role === "hr" || session.role === "exco";
  const isManager = session.role === "manager";

  if (isPrivileged) {
    return {
      OR: [
        { recipientEmployeeId: null },
        ...(session.employeeId ? [{ recipientEmployeeId: session.employeeId }] : []),
      ],
    };
  }
  if (isManager) {
    // Managers see only explicit manager-audience broadcasts (never HR-internal
    // audienceRole: null ones) plus their own personal notifications. This must
    // match the workspace read scope so the two paths cannot drift.
    return {
      OR: [
        { recipientEmployeeId: null, audienceRole: "manager" },
        ...(session.employeeId ? [{ recipientEmployeeId: session.employeeId }] : []),
      ],
    };
  }
  // Employee: only their personal notifications.
  return session.employeeId
    ? { recipientEmployeeId: session.employeeId }
    : { id: "__never__" };
}
