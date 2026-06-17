import { describe, expect, it } from "vitest";
import { getLeaveRequestsByEmployee, getLeaveRequestsByTenant, leaveRequests } from "./leave";

describe("getLeaveRequestsByTenant", () => {
  it("returns only requests for the given tenant, sorted newest-applied-first", () => {
    const result = getLeaveRequestsByTenant("novatech");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.tenantId === "novatech")).toBe(true);
    expect(result.length).toBe(leaveRequests.filter((r) => r.tenantId === "novatech").length);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].appliedOn.localeCompare(result[i + 1].appliedOn)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getLeaveRequestsByTenant("does-not-exist")).toEqual([]);
  });
});

describe("getLeaveRequestsByEmployee", () => {
  it("returns only requests for the given employee, sorted newest-applied-first", () => {
    const employeeId = leaveRequests[0].employeeId;
    const result = getLeaveRequestsByEmployee(employeeId);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.employeeId === employeeId)).toBe(true);
    expect(result.length).toBe(leaveRequests.filter((r) => r.employeeId === employeeId).length);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].appliedOn.localeCompare(result[i + 1].appliedOn)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an empty array for an unknown employee", () => {
    expect(getLeaveRequestsByEmployee("does-not-exist")).toEqual([]);
  });
});
