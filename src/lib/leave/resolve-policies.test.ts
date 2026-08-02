import { describe, it, expect } from "vitest";
import { resolveLeavePolicies } from "./resolve-policies";
import { leavePolicies } from "@/lib/config/leave";
import type { LeavePolicyData } from "./policy-actions";

const baseData: LeavePolicyData = {
  annualDays: 21,
  sickDays: 30,
  familyDays: 3,
  maternityDays: 90,
  parentalDays: 10,
  adoptionDays: 50,
  commissioningDays: 50,
  studyDays: 5,
  unpaidDays: 5,
  annualCarryover: true,
  annualMaxCarryoverDays: 10,
  sickRequireDocDays: 2,
  maternityPaid: false,
  parentalPaid: false,
  adoptionPaid: false,
  commissioningPaid: false,
};

function policy(type: string, list = resolveLeavePolicies(leavePolicies, baseData)) {
  return list.find((p) => p.type === type)!;
}

describe("resolveLeavePolicies", () => {
  it("returns the base policies unchanged when there is no tenant config", () => {
    expect(resolveLeavePolicies(leavePolicies, null)).toBe(leavePolicies);
  });

  it("overrides entitlement days from the tenant config", () => {
    expect(policy("annual").annualDays).toBe(21);
    expect(policy("maternity").annualDays).toBe(90);
  });

  it("keeps maternity unpaid by default (BCEA/UIF)", () => {
    expect(policy("maternity").paid).toBe(false);
    expect(policy("parental").paid).toBe(false);
  });

  it("marks family leave paid when the employer opts in", () => {
    const list = resolveLeavePolicies(leavePolicies, { ...baseData, maternityPaid: true });
    expect(policy("maternity", list).paid).toBe(true);
    // Non-family paid status is untouched.
    expect(policy("annual", list).paid).toBe(true);
    expect(policy("unpaid", list).paid).toBe(false);
  });
});
