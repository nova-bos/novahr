"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";

/**
 * Records the HR admin's one-time acknowledgement of the payroll compliance
 * disclaimer for their tenant. Must be called before the first payroll run.
 * Requires the caller to be an HR user.
 */
export async function acceptPayrollDisclaimer(): Promise<{ ok: true }> {
  const session = await requireRole("hr");
  await runAsTenant(session.tenantId, (tx) =>
    tx.tenant.update({
      where: { id: session.tenantId },
      data: { payrollDisclaimerAcceptedAt: new Date() },
    })
  );
  return { ok: true };
}
