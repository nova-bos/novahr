import { describe, expect, it } from "vitest";
import { buildPayslipHtml } from "./print";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import type { Employee, Payslip } from "@/lib/types";

const mockEmployee: Employee = {
  id: "emp-test-1",
  tenantId: "tenant-test-1",
  employeeNumber: "EMP-001",
  firstName: "Aisha",
  lastName: "Patel",
  email: "aisha.patel@example.com",
  phone: "+27 11 000 0001",
  avatarColor: "#6366f1",
  initials: "AP",
  jobTitle: "Software Engineer",
  department: "Engineering",
  employmentType: "full_time",
  status: "active",
  startDate: "2022-03-01",
  location: "Johannesburg",
  salary: {
    annualGross: 420000,
    currency: "ZAR",
    payFrequency: "monthly",
    travelAllowance: 2500,
    pensionContributionPct: 7.5,
  },
  bankDetails: {
    bank: "FNB",
    accountNumber: "62000000001",
    branchCode: "250655",
    accountType: "Cheque",
  },
  taxNumber: "1234567890",
  idNumber: "9001010001089",
  address: "1 Test Street, Johannesburg, 2001",
  emergencyContact: {
    name: "Raj Patel",
    relationship: "Spouse",
    phone: "+27 82 000 0001",
  },
  leaveBalances: [
    { type: "annual", total: 15, used: 3 },
    { type: "sick", total: 10, used: 1 },
  ],
};

const mockPayslip: Payslip = {
  id: "slip-test-1",
  tenantId: "tenant-test-1",
  employeeId: "emp-test-1",
  runId: "run-test-1",
  period: "2026-06",
  payDate: "2026-06-25",
  basicSalary: 35000,
  grossPay: 37500,
  totalDeductions: 9750,
  netPay: 27750,
  paye: 7500,
  uif: 177.12,
  earnings: [{ label: "Travel allowance", amount: 2500 }],
  deductions: [
    { label: "PAYE", amount: 7500 },
    { label: "UIF", amount: 177.12 },
    { label: "Pension fund (7.5%)", amount: 2625 },
  ],
};

describe("buildPayslipHtml", () => {
  const html = buildPayslipHtml(mockEmployee, mockPayslip);

  it("contains the employee full name", () => {
    expect(html).toContain("Aisha Patel");
  });

  it("contains the job title", () => {
    expect(html).toContain("Software Engineer");
  });

  it("contains the department", () => {
    expect(html).toContain("Engineering");
  });

  it("contains the period formatted as month/year", () => {
    const formatted = formatMonthYear("2026-06");
    expect(html).toContain(formatted);
  });

  it("contains the gross pay as a currency string", () => {
    const formatted = formatCurrency(37500);
    expect(html).toContain(formatted);
  });

  it("contains the net pay as a currency string", () => {
    const formatted = formatCurrency(27750);
    expect(html).toContain(formatted);
  });

  it("contains each deduction label", () => {
    expect(html).toContain("PAYE");
    expect(html).toContain("UIF");
    expect(html).toContain("Pension fund (7.5%)");
  });

  it("contains each earning label", () => {
    expect(html).toContain("Travel allowance");
  });

  it("contains NovaHR branding", () => {
    expect(html).toContain("NovaHR");
  });

  it("is a complete HTML document starting with DOCTYPE", () => {
    expect(html.trimStart()).toMatch(/^<!DOCTYPE/i);
  });

  it("contains basicSalary as a currency string", () => {
    const formatted = formatCurrency(35000);
    expect(html).toContain(formatted);
  });
});
