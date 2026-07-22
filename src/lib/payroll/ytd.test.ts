import { describe, it, expect } from "vitest";
import { computePayslipYtd } from "./ytd";
import type { Payslip } from "@/lib/types";

function makePayslip(overrides: Partial<Payslip> & { period: string; employeeId: string }): Payslip {
  return {
    id: `ps-${overrides.period}-${overrides.employeeId}`,
    tenantId: "t1",
    runId: "run1",
    payDate: `${overrides.period}-25`,
    basicSalary: 10000,
    earnings: [{ label: "Travel allowance", amount: 1000 }],
    deductions: [{ label: "PAYE", amount: 1500 }, { label: "UIF", amount: 100 }],
    grossPay: 11000,
    totalDeductions: 1600,
    netPay: 9400,
    paye: 1500,
    uif: 100,
    ...overrides,
  };
}

describe("computePayslipYtd", () => {
  it("sums payslips from the tax-year start up to and including the current period", () => {
    const payslips = [
      makePayslip({ period: "2026-04", employeeId: "e1" }),
      makePayslip({ period: "2026-05", employeeId: "e1" }),
      makePayslip({ period: "2026-06", employeeId: "e1" }),
    ];
    const ytd = computePayslipYtd(payslips, "e1", "2026-06", 3);
    expect(ytd.grossPay).toBe(33000);
    expect(ytd.netPay).toBe(28200);
    expect(ytd.earnings["Travel allowance"]).toBe(3000);
    expect(ytd.deductions["PAYE"]).toBe(4500);
    expect(ytd.basicSalary).toBe(30000);
  });

  it("excludes payslips after the current period", () => {
    const payslips = [
      makePayslip({ period: "2026-04", employeeId: "e1" }),
      makePayslip({ period: "2026-05", employeeId: "e1" }),
      makePayslip({ period: "2026-06", employeeId: "e1" }),
    ];
    const ytd = computePayslipYtd(payslips, "e1", "2026-05", 3);
    expect(ytd.grossPay).toBe(22000);
  });

  it("resets at the tax-year boundary (March start)", () => {
    // Feb 2026 belongs to the tax year that started March 2025;
    // it must not be included when computing YTD for April 2026.
    const payslips = [
      makePayslip({ period: "2026-02", employeeId: "e1" }),
      makePayslip({ period: "2026-04", employeeId: "e1" }),
    ];
    const ytd = computePayslipYtd(payslips, "e1", "2026-04", 3);
    expect(ytd.grossPay).toBe(11000);
  });

  it("only counts the target employee", () => {
    const payslips = [
      makePayslip({ period: "2026-04", employeeId: "e1" }),
      makePayslip({ period: "2026-04", employeeId: "e2" }),
    ];
    const ytd = computePayslipYtd(payslips, "e1", "2026-04", 3);
    expect(ytd.grossPay).toBe(11000);
  });

  it("handles a period before the tax-year start month within the same calendar year", () => {
    // Jan 2027 is in the tax year that began March 2026.
    const payslips = [
      makePayslip({ period: "2026-03", employeeId: "e1" }),
      makePayslip({ period: "2026-12", employeeId: "e1" }),
      makePayslip({ period: "2027-01", employeeId: "e1" }),
    ];
    const ytd = computePayslipYtd(payslips, "e1", "2027-01", 3);
    expect(ytd.grossPay).toBe(33000);
  });
});
