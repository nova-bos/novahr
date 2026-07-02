import { describe, expect, it } from "vitest";
import {
  CORE_LEAVE_TYPES,
  DEFAULT_LEAVE_TOTALS,
  FAMILY_LEAVE_TYPES,
  OTHER_LEAVE_TYPES,
  getLeavePolicy,
  leavePolicies,
} from "./leave";
import type { LeaveType } from "@/lib/types";

const ALL_TYPES: LeaveType[] = [
  "annual",
  "sick",
  "family",
  "maternity",
  "parental",
  "adoption",
  "commissioning",
  "study",
  "unpaid",
];

describe("leavePolicies", () => {
  it("defines a policy for every leave type", () => {
    const covered = leavePolicies.map((p) => p.type).sort();
    expect(covered).toEqual([...ALL_TYPES].sort());
  });

  it("meets or exceeds BCEA statutory minimums", () => {
    expect(getLeavePolicy("annual").annualDays).toBeGreaterThanOrEqual(15);
    expect(getLeavePolicy("sick").annualDays).toBe(30);
    expect(getLeavePolicy("sick").cycleMonths).toBe(36);
    expect(getLeavePolicy("family").annualDays).toBe(3);
    expect(getLeavePolicy("maternity").annualDays).toBe(88); // 4 months
    expect(getLeavePolicy("parental").annualDays).toBe(10);
    expect(getLeavePolicy("adoption").annualDays).toBe(50); // 10 weeks
    expect(getLeavePolicy("commissioning").annualDays).toBe(50); // 10 weeks
  });

  it("marks UIF-funded statutory family leave as unpaid by the employer", () => {
    for (const type of ["maternity", "parental", "adoption", "commissioning"] as LeaveType[]) {
      expect(getLeavePolicy(type).paid).toBe(false);
    }
  });

  it("marks BCEA paid leave types as paid", () => {
    for (const type of ["annual", "sick", "family"] as LeaveType[]) {
      expect(getLeavePolicy(type).paid).toBe(true);
    }
  });
});

describe("DEFAULT_LEAVE_TOTALS", () => {
  it("matches the policy entitlements", () => {
    for (const policy of leavePolicies) {
      expect(DEFAULT_LEAVE_TOTALS[policy.type]).toBe(policy.annualDays);
    }
  });
});

describe("leave type groups", () => {
  it("cover every type exactly once", () => {
    const grouped = [...CORE_LEAVE_TYPES, ...FAMILY_LEAVE_TYPES, ...OTHER_LEAVE_TYPES];
    expect([...grouped].sort()).toEqual([...ALL_TYPES].sort());
  });
});

describe("getLeavePolicy", () => {
  it("throws for unknown types", () => {
    expect(() => getLeavePolicy("sabbatical" as LeaveType)).toThrow();
  });
});
