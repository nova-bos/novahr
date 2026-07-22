import type { NotificationItem } from "@/lib/types";

/**
 * Whether a notification should be visible to the given user. This mirrors the
 * server-side scoping in workspace/actions.ts so that optimistically-added
 * notifications (dispatched into the client store right after an action) follow
 * exactly the same rules the next full workspace load would apply, preventing
 * drift where a user briefly sees a notification meant for another audience.
 *
 * - hr / exco: all broadcasts (recipientEmployeeId null) plus their own personal ones.
 * - manager:   only audienceRole "manager" broadcasts plus their own personal ones.
 * - employee:  only their own personal notifications.
 */
export function isNotificationVisibleTo(
  n: Pick<NotificationItem, "audienceRole" | "recipientEmployeeId">,
  user: { role: string; employeeId?: string | null } | null | undefined
): boolean {
  if (!user) return false;

  // Personal notifications: only the named recipient sees them.
  if (n.recipientEmployeeId) {
    return !!user.employeeId && n.recipientEmployeeId === user.employeeId;
  }

  // Broadcasts (no specific recipient) are gated by audience role.
  if (user.role === "hr" || user.role === "exco") return true;
  if (user.role === "manager") return n.audienceRole === "manager";
  return false; // employees never see broadcasts
}
