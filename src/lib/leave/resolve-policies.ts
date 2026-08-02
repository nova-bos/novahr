import type { LeavePolicy, LeaveType } from "@/lib/types";
import type { LeavePolicyData } from "./policy-actions";

/**
 * Merges a tenant's configured entitlement days and family-leave paid status
 * over the statutory default policies, so displays reflect the company's policy.
 * Family leave (maternity, parental, adoption, commissioning) stays unpaid by
 * default (the BCEA position: the employee claims from the UIF) unless the
 * tenant has opted to pay it.
 */
export function resolveLeavePolicies(
  base: LeavePolicy[],
  data: LeavePolicyData | null
): LeavePolicy[] {
  if (!data) return base;

  const daysByType: Partial<Record<LeaveType, number>> = {
    annual: data.annualDays,
    sick: data.sickDays,
    family: data.familyDays,
    maternity: data.maternityDays,
    parental: data.parentalDays,
    adoption: data.adoptionDays,
    commissioning: data.commissioningDays,
    study: data.studyDays,
    unpaid: data.unpaidDays,
  };
  const paidByType: Partial<Record<LeaveType, boolean>> = {
    maternity: data.maternityPaid,
    parental: data.parentalPaid,
    adoption: data.adoptionPaid,
    commissioning: data.commissioningPaid,
  };

  return base.map((policy) => ({
    ...policy,
    annualDays: daysByType[policy.type] ?? policy.annualDays,
    paid: paidByType[policy.type] ?? policy.paid,
  }));
}
