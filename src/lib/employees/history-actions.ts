"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireEmployeeScope } from "@/lib/auth/require";

export interface EmployeeHistoryEvent {
  id: string;
  type: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  effectiveDate: string;
}

/**
 * Promotion/transfer history for one employee, newest first. Scoped via
 * requireEmployeeScope so an employee can read their own timeline (and their
 * manager and HR can too).
 */
export async function getEmployeeHistoryAction(
  employeeId: string
): Promise<EmployeeHistoryEvent[]> {
  const user = await requireEmployeeScope(employeeId);
  return runAsTenant(user.tenantId, async (tx) => {
    const rows = await tx.employeeHistoryEvent.findMany({
      where: { tenantId: user.tenantId, employeeId },
      orderBy: { effectiveDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      field: r.field,
      oldValue: r.oldValue,
      newValue: r.newValue,
      changedBy: r.changedBy,
      effectiveDate: r.effectiveDate.toISOString(),
    }));
  });
}
