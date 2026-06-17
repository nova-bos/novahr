import { describe, expect, it } from "vitest";
import { createEmployee, newOnboardingPlan, type NewEmployeeInput } from "./factory";
import { ONBOARDING_STEPS } from "@/demo/employees";

function makeInput(overrides: Partial<NewEmployeeInput> = {}): NewEmployeeInput {
  return {
    tenantId: "novatech",
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@example.com",
    phone: "+27 71 000 0000",
    jobTitle: "Software Engineer",
    department: "Engineering",
    employmentType: "full_time",
    status: "active",
    startDate: "2026-06-15",
    location: "Cape Town",
    annualGross: 600_000,
    ...overrides,
  };
}

describe("createEmployee", () => {
  it("derives the employee number from the tenant's prefix and existing count", () => {
    const employee = createEmployee(makeInput({ tenantId: "novatech" }), 0);
    expect(employee.employeeNumber).toBe("NT-0001");
  });

  it("uses the apex prefix for apex tenants", () => {
    const employee = createEmployee(makeInput({ tenantId: "apex" }), 4);
    expect(employee.employeeNumber).toBe("AF-0005");
  });

  it("uses the horizon prefix for horizon tenants", () => {
    const employee = createEmployee(makeInput({ tenantId: "horizon" }), 9);
    expect(employee.employeeNumber).toBe("HL-0010");
  });

  it("falls back to the first two letters of the tenant id for unknown tenants", () => {
    const employee = createEmployee(makeInput({ tenantId: "globex" }), 0);
    expect(employee.employeeNumber).toBe("GL-0001");
  });

  it("sets initials and basic profile fields from the input", () => {
    const employee = createEmployee(makeInput({ firstName: "Bongani", lastName: "Khumalo" }), 0);
    expect(employee.initials).toBe("BK");
    expect(employee.firstName).toBe("Bongani");
    expect(employee.lastName).toBe("Khumalo");
    expect(employee.employmentType).toBe("full_time");
    expect(employee.status).toBe("active");
  });

  it("builds the salary block with a default pension contribution", () => {
    const employee = createEmployee(
      makeInput({ annualGross: 450_000, travelAllowance: 2_000, housingAllowance: 1_500, medicalAid: 1_800 }),
      0
    );
    expect(employee.salary).toEqual({
      annualGross: 450_000,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: 2_000,
      housingAllowance: 1_500,
      pensionContributionPct: 0.075,
      medicalAid: 1_800,
    });
  });

  it("seeds default leave balances", () => {
    const employee = createEmployee(makeInput(), 0);
    expect(employee.leaveBalances).toEqual([
      { type: "annual", total: 18, used: 0 },
      { type: "sick", total: 10, used: 0 },
      { type: "unpaid", total: 5, used: 0 },
      { type: "family", total: 3, used: 0 },
    ]);
  });

  it("only sets an onboarding plan for employees on probation", () => {
    const probationEmployee = createEmployee(makeInput({ status: "probation" }), 0);
    expect(probationEmployee.onboarding).toBeDefined();
    expect(probationEmployee.onboarding?.progress).toBe(0);
    expect(probationEmployee.onboarding?.startDate).toBe("2026-06-15");

    const activeEmployee = createEmployee(makeInput({ status: "active" }), 0);
    expect(activeEmployee.onboarding).toBeUndefined();
  });

  it("generates an id scoped to the tenant", () => {
    const employee = createEmployee(makeInput({ tenantId: "novatech" }), 0);
    expect(employee.id).toMatch(/^novatech-emp-\d+$/);
  });
});

describe("newOnboardingPlan", () => {
  it("starts at 0% progress with every step incomplete", () => {
    const plan = newOnboardingPlan("2026-06-15");
    expect(plan.progress).toBe(0);
    expect(plan.startDate).toBe("2026-06-15");
    expect(plan.buddy).toBeUndefined();
    expect(plan.steps).toHaveLength(ONBOARDING_STEPS.length);
    expect(plan.steps.every((step) => step.complete === false)).toBe(true);
    expect(plan.steps.map((step) => step.id)).toEqual(ONBOARDING_STEPS.map((step) => step.id));
  });

  it("carries through the assigned buddy", () => {
    const plan = newOnboardingPlan("2026-06-15", "Thabo Nkosi");
    expect(plan.buddy).toBe("Thabo Nkosi");
  });
});
