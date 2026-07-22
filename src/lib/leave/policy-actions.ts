"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";

export interface LeavePolicyData {
  annualDays: number;
  sickDays: number;
  familyDays: number;
  maternityDays: number;
  parentalDays: number;
  adoptionDays: number;
  commissioningDays: number;
  studyDays: number;
  unpaidDays: number;
  annualCarryover: boolean;
  annualMaxCarryoverDays: number;
  sickRequireDocDays: number;
}

// SA statutory minimums
const MINIMUMS: Partial<Record<keyof LeavePolicyData, number>> = {
  annualDays: 15,
  sickDays: 30,
  familyDays: 3,
  maternityDays: 88,
  parentalDays: 10,
  adoptionDays: 50,
  commissioningDays: 50,
  studyDays: 5,
  unpaidDays: 0,
};

// LEAVE_MINIMUMS is intentionally not exported from this "use server" file.
// Import it from @/lib/config/leave instead.

const DEFAULTS: LeavePolicyData = {
  annualDays: 15,
  sickDays: 30,
  familyDays: 3,
  maternityDays: 88,
  parentalDays: 10,
  adoptionDays: 50,
  commissioningDays: 50,
  studyDays: 5,
  unpaidDays: 5,
  annualCarryover: true,
  annualMaxCarryoverDays: 10,
  sickRequireDocDays: 2,
};

export async function getLeavePolicyAction(tenantId: string): Promise<LeavePolicyData> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const policy = await tx.tenantLeavePolicy.findUnique({ where: { tenantId } });
    return policy ?? DEFAULTS;
  });
}

export async function updateLeavePolicyAction(
  tenantId: string,
  data: LeavePolicyData
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  // Enforce minimums
  const violations = Object.entries(MINIMUMS)
    .filter(([key, min]) => {
      const val = data[key as keyof LeavePolicyData];
      return typeof val === "number" && typeof min === "number" && val < min;
    })
    .map(([key, min]) => `${key} cannot be less than ${min} days`);
  if (violations.length > 0) {
    return { success: false, error: violations.join(", ") };
  }
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.tenantLeavePolicy.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
