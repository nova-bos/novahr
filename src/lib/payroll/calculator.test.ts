import { describe, expect, it } from "vitest";
import { buildPayslip, calculateMonthlyPayroll, incrementPeriod } from "./calculator";
import type { Employee, SalaryInfo } from "@/lib/types";

function makeEmployee(salary: SalaryInfo): Employee {
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
  };
}

describe("calculateMonthlyPayroll", () => {
  it("returns zero PAYE when annual income falls within the primary rebate", () => {
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

  it("caps UIF at the monthly cap for higher earners", () => {
    const employee = makeEmployee({
      annualGross: 600_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.basicSalary).toBe(50_000);
    expect(breakdown.grossPay).toBe(50_000);
    expect(breakdown.paye).toBe(11_302.67);
    expect(breakdown.uif).toBe(177.12);
    expect(breakdown.totalDeductions).toBe(11_479.79);
    expect(breakdown.netPay).toBe(38_520.21);
  });

  it("includes travel and housing allowances in earnings and gross pay", () => {
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
    expect(breakdown.paye).toBe(3_483.08);
    expect(breakdown.uif).toBe(177.12);
  });

  it("adds pension and medical aid deductions when configured", () => {
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
      { label: "PAYE (Income Tax)", amount: 3_483.08 },
      { label: "UIF Contribution", amount: 177.12 },
      { label: "Pension Fund", amount: 1_875 },
      { label: "Medical Aid", amount: 2_500 },
    ]);
    expect(breakdown.totalDeductions).toBe(8_035.2);
    expect(breakdown.netPay).toBe(24_964.8);
  });

  it("omits pension and medical aid deductions when not configured", () => {
    const employee = makeEmployee({
      annualGross: 300_000,
      currency: "ZAR",
      payFrequency: "monthly",
    });

    const breakdown = calculateMonthlyPayroll(employee);

    expect(breakdown.deductions.map((d) => d.label)).toEqual([
      "PAYE (Income Tax)",
      "UIF Contribution",
    ]);
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
});

describe("incrementPeriod", () => {
  it("increments the month within a year", () => {
    expect(incrementPeriod("2026-01")).toBe("2026-02");
  });

  it("rolls over from December to January of the next year", () => {
    expect(incrementPeriod("2026-12")).toBe("2027-01");
  });
});
