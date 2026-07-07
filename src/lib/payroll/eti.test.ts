import { describe, expect, it } from "vitest";
import { calculateEti, deriveDateOfBirthFromSaId } from "./eti";
import type { Employee, SalaryInfo } from "@/lib/types";

// A young, ID-holding, post-2013 employee who is otherwise ETI-eligible.
function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  const salary: SalaryInfo = { annualGross: 60_000, currency: "ZAR", payFrequency: "monthly" };
  return {
    id: "emp-1",
    tenantId: "tenant-1",
    employeeNumber: "NT-0001",
    firstName: "Sipho",
    lastName: "Ndlovu",
    email: "sipho@example.com",
    phone: "+27 71 000 0000",
    avatarColor: "#000000",
    initials: "SN",
    jobTitle: "Assistant",
    department: "Operations",
    employmentType: "full_time",
    status: "active",
    startDate: "2024-01-01",
    location: "Durban",
    salary,
    bankDetails: {
      bank: "Standard Bank",
      accountNumber: "1234567890",
      branchCode: "051001",
      accountType: "Cheque",
      validated: false,
      validatedAt: null,
    },
    taxNumber: "1234567890",
    idNumber: "0006155800081",
    address: "1 Main Street, Durban",
    emergencyContact: { name: "Thandi", relationship: "Sister", phone: "+27 71 111 1111" },
    leaveBalances: [],
    dateOfBirth: "2000-06-15", // age 25 at the periods tested below
    ...overrides,
  };
}

const PERIOD = "2026-03"; // last day 2026-03-31

// Tripwire for the ETI bands encoded in eti.ts. These values follow the
// structure effective 1 April 2025 and MUST be re-verified against the current
// SARS ETI guide. If someone edits a band, rate or threshold, these fail.
describe("calculateEti — first 12 qualifying months", () => {
  it("pays 60% in the lowest band", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 2000, monthsAlreadyClaimed: 0 },
      makeEmployee()
    );
    expect(r.qualifies).toBe(true);
    expect(r.qualifyingMonth).toBe(1);
    expect(r.amount).toBeCloseTo(1200, 2); // 0.60 * 2000
  });

  it("pays the flat maximum in the middle band", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 0 },
      makeEmployee()
    );
    expect(r.amount).toBeCloseTo(1500, 2);
  });

  it("tapers to R750 at R6,500", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 6500, monthsAlreadyClaimed: 0 },
      makeEmployee()
    );
    // 1500 - 0.75 * (6500 - 5500) = 1500 - 750
    expect(r.amount).toBeCloseTo(750, 2);
  });
});

describe("calculateEti — second 12 qualifying months", () => {
  it("pays half the flat maximum", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 12 },
      makeEmployee()
    );
    expect(r.qualifyingMonth).toBe(13);
    expect(r.amount).toBeCloseTo(750, 2);
  });
});

describe("deriveDateOfBirthFromSaId", () => {
  it("derives a 2000s birth date for a young employee", () => {
    // 000615... -> 15 June 2000
    expect(deriveDateOfBirthFromSaId("0006155800081")).toBe("2000-06-15");
  });

  it("derives a 1900s birth date for a two-digit year above the current year", () => {
    // 970101... -> 1 January 1997
    expect(deriveDateOfBirthFromSaId("9701015800088")).toBe("1997-01-01");
  });

  it("returns null for an unparseable id", () => {
    expect(deriveDateOfBirthFromSaId("abc")).toBeNull();
    expect(deriveDateOfBirthFromSaId("0013015800089")).toBeNull(); // month 13
  });

  it("lets ETI derive age from the id when dateOfBirth is absent", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 0 },
      { idNumber: "0006155800081", startDate: "2024-01-01" } // age 25, no dateOfBirth
    );
    expect(r.qualifies).toBe(true);
  });
});

describe("calculateEti — disqualifications", () => {
  it("rejects employees at or above the remuneration ceiling", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 7500, monthsAlreadyClaimed: 0 },
      makeEmployee()
    );
    expect(r.qualifies).toBe(false);
    expect(r.disqualifications).toContain("remuneration_above_ceiling");
  });

  it("rejects employees below the minimum wage floor", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 1500, monthsAlreadyClaimed: 0 },
      makeEmployee()
    );
    expect(r.disqualifications).toContain("below_minimum_wage");
  });

  it("rejects employees older than 29", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 0 },
      makeEmployee({ dateOfBirth: "1990-01-01" })
    );
    expect(r.disqualifications).toContain("age_out_of_range");
  });

  it("rejects employees younger than 18", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 0 },
      makeEmployee({ dateOfBirth: "2012-01-01" })
    );
    expect(r.disqualifications).toContain("age_out_of_range");
  });

  it("rejects employees first employed before 1 October 2013", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 0 },
      makeEmployee({ startDate: "2013-09-30" })
    );
    expect(r.disqualifications).toContain("employed_before_2013");
  });

  it("rejects once 24 qualifying months are exhausted", () => {
    const r = calculateEti(
      { period: PERIOD, monthlyRemuneration: 3500, monthsAlreadyClaimed: 24 },
      makeEmployee()
    );
    expect(r.disqualifications).toContain("qualifying_months_exhausted");
  });
});
