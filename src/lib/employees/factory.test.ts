import { describe, expect, it } from "vitest";
import { createEmployee, deriveEmployeePrefix, newOnboardingPlan, type NewEmployeeInput } from "./factory";
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

describe("deriveEmployeePrefix", () => {
  it("uses initials of multi-word company names", () => {
    expect(deriveEmployeePrefix("Nova Technologies")).toBe("NT");
    expect(deriveEmployeePrefix("Apex Financial Group")).toBe("AFG");
    expect(deriveEmployeePrefix("Horizon Logistics")).toBe("HL");
  });

  it("uses first 3 chars of a single-word name", () => {
    expect(deriveEmployeePrefix("ACME")).toBe("ACM");
    expect(deriveEmployeePrefix("globex")).toBe("GLO");
    expect(deriveEmployeePrefix("novatech")).toBe("NOV");
  });

  it("caps at 3 characters", () => {
    expect(deriveEmployeePrefix("Alpha Beta Gamma Delta")).toBe("ABG");
  });
});

describe("createEmployee", () => {
  it("uses the company name prefix when provided", () => {
    const employee = createEmployee(makeInput(), 0, "Nova Technologies");
    expect(employee.employeeNumber).toBe("NT-0001");
  });

  it("falls back to the tenant ID for prefix when no company name given", () => {
    const employee = createEmployee(makeInput({ tenantId: "globex" }), 0);
    expect(employee.employeeNumber).toBe("GLO-0001");
  });

  it("sequences numbers based on existing count", () => {
    const employee = createEmployee(makeInput(), 4, "Apex Financial Group");
    expect(employee.employeeNumber).toBe("AFG-0005");
  });

  it("sets initials and basic profile fields from the input", () => {
    const employee = createEmployee(makeInput({ firstName: "Bongani", lastName: "Khumalo" }), 0);
    expect(employee.initials).toBe("BK");
    expect(employee.firstName).toBe("Bongani");
    expect(employee.lastName).toBe("Khumalo");
    expect(employee.employmentType).toBe("full_time");
    expect(employee.status).toBe("active");
  });

  it("builds the salary block from the input, with no pension by default", () => {
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
      pensionContributionPct: undefined,
      medicalAid: 1_800,
      retirementAnnuity: undefined,
    });
  });

  it("seeds default leave balances", () => {
    const employee = createEmployee(makeInput(), 0);
    expect(employee.leaveBalances).toEqual([
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
