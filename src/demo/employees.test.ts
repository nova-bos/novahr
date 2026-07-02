import { describe, expect, it } from "vitest";
import {
  defaultLeaveBalances,
  employees,
  getEmployee,
  getEmployeesByTenant,
  ONBOARDING_STEPS,
  onboardingPlan,
} from "./employees";

describe("defaultLeaveBalances", () => {
  it("returns the standard leave totals with nothing used yet", () => {
    expect(defaultLeaveBalances()).toEqual([
      { type: "annual", total: 18, used: 0 },
      { type: "sick", total: 30, used: 0 },
      { type: "family", total: 3, used: 0 },
      { type: "maternity", total: 88, used: 0 },
      { type: "parental", total: 10, used: 0 },
      { type: "adoption", total: 50, used: 0 },
      { type: "commissioning", total: 50, used: 0 },
      { type: "study", total: 5, used: 0 },
      { type: "unpaid", total: 5, used: 0 },
    ]);
  });
});

describe("onboardingPlan", () => {
  it("marks no steps complete and reports 0% progress when nothing is done", () => {
    const plan = onboardingPlan(0, "2026-06-15");

    expect(plan.progress).toBe(0);
    expect(plan.startDate).toBe("2026-06-15");
    expect(plan.buddy).toBeUndefined();
    expect(plan.steps.every((step) => step.complete === false)).toBe(true);
  });

  it("marks the first N steps complete and reports proportional progress", () => {
    const plan = onboardingPlan(3, "2026-06-15", "Thabo Nkosi");

    expect(plan.progress).toBe(50);
    expect(plan.buddy).toBe("Thabo Nkosi");
    expect(plan.steps.slice(0, 3).every((step) => step.complete === true)).toBe(true);
    expect(plan.steps.slice(3).every((step) => step.complete === false)).toBe(true);
  });

  it("marks every step complete and reports 100% progress when fully done", () => {
    const plan = onboardingPlan(ONBOARDING_STEPS.length, "2026-06-15");

    expect(plan.progress).toBe(100);
    expect(plan.steps.every((step) => step.complete === true)).toBe(true);
  });
});

describe("getEmployeesByTenant", () => {
  it("returns only employees belonging to the given tenant", () => {
    const result = getEmployeesByTenant("novatech");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.tenantId === "novatech")).toBe(true);
    expect(result.length).toBe(employees.filter((e) => e.tenantId === "novatech").length);
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getEmployeesByTenant("does-not-exist")).toEqual([]);
  });
});

describe("getEmployee", () => {
  it("returns the employee with the given id", () => {
    const employee = employees[0];
    expect(getEmployee(employee.id)).toBe(employee);
  });

  it("returns undefined for an unknown id", () => {
    expect(getEmployee("does-not-exist")).toBeUndefined();
  });
});
