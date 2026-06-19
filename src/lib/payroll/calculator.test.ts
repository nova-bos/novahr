import { describe, expect, it } from "vitest";
import { buildPayslip, calculateMonthlyPayroll, incrementPeriod } from "./calculator";
import type { Employee, SalaryInfo } from "@/lib/types";

function makeEmployee(salary: SalaryInfo, dateOfBirth?: string): Employee {
  return {
    id: "emp-1",
    tenantId: "tenant-1",
    employeeNumber: "NT-0001",
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@example.com",
    phone: "+27 71 000 0000",
    avatarColor: "#000000",
    initials: "AP",
    jobTitle: "Software Engineer",
    department: "Engineering",
    employmentType: "full_time",
    status: "active",
    startDate: "2024-01-01",
    location: "Cape Town",
    salary,
    bankDetails: {
      bank: "Standard Bank",
      accountNumber: "1234567890",
      branchCode: "051001",
      accountType: "Cheque",
    },
    taxNumber: "1234567890",
    idNumber: "9001015800082",
    address: "1 Main Street, Cape Town",
    emergencyContact: {
      name: "John Patel",
      relationship: "Spouse",
      phone: "+27 71 111 1111",
    },
    leaveBalances: [],
    dateOfBirth,
  };
}

// ---- PAYE: brackets and rebates ----

describe("calculateMonthlyPayroll", () => {
  it("returns zero PAYE when annual income is below the primary rebate threshold", () => {
    const employee = makeEmployee({
      annualGross: 90_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.basicSalary).toBe(7_500);
    expect(breakdown.earnings).toEqual([]);
    expect(breakdown.grossPay).toBe(7_500);
    expect(breakdown.paye).toBe(0);
    expect(breakdown.uif).toBe(75);
    expect(breakdown.deductions).toEqual([
      { label: "PAYE (Income Tax)", amount: 0 },
      { label: "UIF Contribution", amount: 75 },
    ]);
    expect(breakdown.totalDeductions).toBe(75);
    expect(breakdown.netPay).toBe(7_425);
  });

  it("calculates correct PAYE for a mid-range salary using 2026/27 brackets", () => {
    // annualTaxable = 600,000
    // bracket 4: base 125,599 + (600,000 - 530,200) * 0.36 = 150,727
    // rebate 17,820 -> annualPAYE 132,907 -> monthly 11,075.58
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.basicSalary).toBe(50_000);
    expect(breakdown.grossPay).toBe(50_000);
    expect(breakdown.paye).toBe(11_075.58);
    expect(breakdown.uif).toBe(177.12);
    expect(breakdown.totalDeductions).toBe(11_252.70);
    expect(breakdown.netPay).toBe(38_747.30);
  });

  it("includes secondary rebate for employees aged 65 or older", () => {
    // Same salary but with 65-year-old dob -> rebate = 17,820 + 9,765 = 27,585
    const employee = makeEmployee(
      { annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" },
      "1961-01-01"
    );

    const breakdown = calculateMonthlyPayroll(employee);

    // annualPAYE = 150,727 - 27,585 = 123,142 -> monthly 10,261.83
    expect(breakdown.paye).toBe(10_261.83);
  });

  it("includes tertiary rebate for employees aged 75 or older", () => {
    // rebate = 17,820 + 9,765 + 3,249 = 30,834
    const employee = makeEmployee(
      { annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" },
      "1951-01-01"
    );

    const breakdown = calculateMonthlyPayroll(employee);

    // annualPAYE = 150,727 - 30,834 = 119,893 -> monthly 9,991.08
    expect(breakdown.paye).toBe(9_991.08);
  });

  // ---- Taxable income: allowance inclusion ----

  it("includes 80% of travel allowance and 100% of housing in taxable income", () => {
    // basicSalary = 25,000
    // travelTaxable = 3,000 * 0.8 = 2,400; housing = 5,000
    // annualRemuneration = (25,000 + 2,400 + 5,000) * 12 = 388,800
    // bracket 3: 79,998 + (388,800 - 383,100) * 0.31 = 81,765
    // annualPAYE = 81,765 - 17,820 = 63,945 -> monthly 5,328.75
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: 3_000,
      housingAllowance: 5_000,
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.basicSalary).toBe(25_000);
    expect(breakdown.earnings).toEqual([
      { label: "Travel Allowance", amount: 3_000 },
      { label: "Housing Allowance", amount: 5_000 },
    ]);
    expect(breakdown.grossPay).toBe(33_000);
    expect(breakdown.paye).toBe(5_328.75);
    expect(breakdown.uif).toBe(177.12);
  });

  it("uses 20% travel inclusion when employee has a SARS logbook", () => {
    // travelTaxable = 3,000 * 0.2 = 600; housing = 5,000
    // annualRemuneration = (25,000 + 600 + 5,000) * 12 = 367,200
    // bracket 2: 44,118 + (367,200 - 245,100) * 0.26 = 44,118 + 31,746 = 75,864
    // annualPAYE = 75,864 - 17,820 = 58,044 -> monthly 4,837
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: 3_000,
      housingAllowance: 5_000,
      hasLogbook: true,
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.paye).toBe(4_837);
  });

  // ---- Pension s11F deduction ----

  it("deducts pension from taxable income before PAYE (s11F)", () => {
    // annualRemuneration = 388,800 (from test above, no logbook)
    // pensionAnnual = 25,000 * 0.075 * 12 = 22,500
    // s11F cap: min(22,500, min(388,800 * 0.275, 430,000)) = min(22,500, 106,920) = 22,500
    // annualTaxable = 388,800 - 22,500 = 366,300
    // bracket 2: 44,118 + (366,300 - 245,100) * 0.26 = 75,630
    // annualPAYE = 75,630 - 17,820 = 57,810 -> monthly 4,817.50
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: 3_000,
      housingAllowance: 5_000,
      pensionContributionPct: 0.075,
      medicalAid: 2_500,
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.deductions).toEqual([
      { label: "PAYE (Income Tax)", amount: 4_817.50 },
      { label: "UIF Contribution", amount: 177.12 },
      { label: "Pension Fund", amount: 1_875 },
      { label: "Medical Aid", amount: 2_500 },
    ]);
    expect(breakdown.totalDeductions).toBe(9_369.62);
    expect(breakdown.netPay).toBe(23_630.38);
  });

  // ---- Medical Aid Tax Credit ----

  it("reduces PAYE by Medical Aid Tax Credit when medicalAidDependants is set", () => {
    // annualTaxable = 600,000; annualPAYE = 132,907
    // MATC: main 376 + first dependant 376 = 752/month -> 9,024/year
    // adjusted annualPAYE = 132,907 - 9,024 = 123,883 -> monthly 10,323.58
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
      medicalAid: 3_000,
      medicalAidDependants: 1,
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.paye).toBe(10_323.58);
  });

  it("applies extra MATC per additional dependant beyond the first", () => {
    // MATC: 376 + 376 + 254 * 2 = 1,260/month -> 15,120/year
    // annualPAYE = 132,907 - 15,120 = 117,787 -> monthly 9,815.58
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
      medicalAid: 5_000,
      medicalAidDependants: 3,
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.paye).toBe(9_815.58);
  });

  // ---- UIF cap ----

  it("caps UIF at the monthly cap for high earners", () => {
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    expect(calculateMonthlyPayroll(employee).uif).toBe(177.12);
  });

  // ---- SDL ----

  it("returns zero SDL by default", () => {
    const employee = makeEmployee({ annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" });
    expect(calculateMonthlyPayroll(employee).employerSdl).toBe(0);
  });

  it("calculates SDL as 1% of gross pay when isSDLLiable is true", () => {
    const employee = makeEmployee({ annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" });
    const breakdown = calculateMonthlyPayroll(employee, { isSDLLiable: true });
    expect(breakdown.employerSdl).toBe(500); // 50,000 * 0.01
  });

  it("does not include SDL in employee deductions or net pay", () => {
    const employee = makeEmployee({ annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" });
    const breakdown = calculateMonthlyPayroll(employee, { isSDLLiable: true });
    expect(breakdown.deductions.find((d) => d.label.toLowerCase().includes("sdl"))).toBeUndefined();
    expect(breakdown.netPay).toBe(38_747.30); // same as without SDL
  });

  // ---- Employer UIF ----

  it("returns employer UIF matching employee UIF contribution", () => {
    const employee = makeEmployee({ annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" });
    const breakdown = calculateMonthlyPayroll(employee);
    expect(breakdown.employerUif).toBe(177.12);
  });

  // ---- Unpaid leave ----

  it("adds Unpaid Leave deduction and reduces tax base for the month", () => {
    // basicSalary = 25,000; 5 unpaid days out of 21 working days
    // unpaidDeduction = 25,000 * 5 / 21 = 5,952.38
    // adjustedBasic = 25,000 - 5,952.38 = 19,047.62
    // adjustedGross = 19,047.62 (no allowances)
    // annualTaxable = 19,047.62 * 12 = 228,571 (rounded)
    // bracket 1: 228,571 * 0.18 = 41,142.78
    // annualPAYE = 41,142.78 - 17,820 = 23,322.78 -> monthly 1,943.57
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const breakdown = calculateMonthlyPayroll(employee, { unpaidLeaveDays: 5, workingDaysInMonth: 21 });

    expect(breakdown.deductions.find((d) => d.label === "Unpaid Leave")).toEqual({
      label: "Unpaid Leave",
      amount: 5_952.38,
    });
    expect(breakdown.paye).toBe(1_943.57);
  });

  // ---- Optional deductions absent when not configured ----

  it("omits pension and medical aid when not configured", () => {
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    expect(calculateMonthlyPayroll(employee).deductions.map((d) => d.label)).toEqual([
      "PAYE (Income Tax)",
      "UIF Contribution",
    ]);
  });

  // ---- Pay frequency ----

  it("calculates bi-weekly basic salary as annualGross / 26", () => {
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "biweekly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    // basicSalary = 300,000 / 26 = 11,538.46
    expect(breakdown.basicSalary).toBe(11_538.46);
  });

  it("scales UIF cap for bi-weekly pay frequency", () => {
    // uifCap = 177.12 * 12 / 26 = 81.75
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "biweekly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    // grossPay = 600,000 / 26 = 23,076.92; 1% = 230.77 > 81.75 -> capped
    expect(breakdown.uif).toBe(81.75);
  });
});

describe("buildPayslip", () => {
  it("combines the payroll breakdown with payslip identifiers", () => {
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const payslip = buildPayslip(employee, "run-2026-01", "2026-01", "2026-01-25");

    expect(payslip.id).toBe("run-2026-01-emp-1");
    expect(payslip.tenantId).toBe("tenant-1");
    expect(payslip.runId).toBe("run-2026-01");
    expect(payslip.employeeId).toBe("emp-1");
    expect(payslip.period).toBe("2026-01");
    expect(payslip.payDate).toBe("2026-01-25");
    expect(payslip.grossPay).toBe(calculateMonthlyPayroll(employee).grossPay);
  });

  it("does not expose employer SDL or employer UIF on the payslip", () => {
    const employee = makeEmployee({ annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" });
    const payslip = buildPayslip(employee, "run-2026-01", "2026-01", "2026-01-25", { isSDLLiable: true });

    expect((payslip as unknown as Record<string, unknown>)["employerSdl"]).toBeUndefined();
    expect((payslip as unknown as Record<string, unknown>)["employerUif"]).toBeUndefined();
  });
});

describe("incrementPeriod", () => {
  it("increments the month within a year", () => {
    expect(incrementPeriod("2026-01")).toBe("2026-02");
  });

  it("rolls over from December to January of the next year", () => {
    expect(incrementPeriod("2026-12")).toBe("2027-01");
  });
});
