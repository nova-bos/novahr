"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapActivityItem } from "@/lib/workspace/mappers";
import type { ActivityItem } from "@/lib/types";

export interface GetActivityLogOptions {
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ActivityLogResult {
  items: ActivityItem[];
  total: number;
}

export async function getActivityLogAction(
  options: GetActivityLogOptions
): Promise<ActivityLogResult> {
  await requireRole("hr");
  const { tenantId, limit = 50, offset = 0 } = options;
  return runAsTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.activityItem.findMany({
        where: { tenantId },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      tx.activityItem.count({ where: { tenantId } }),
    ]);
    return { items: items.map(mapActivityItem), total };
  });
}
