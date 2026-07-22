import type { Payslip } from "@/lib/types";

export interface PayslipYtd {
  basicSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  uif: number;
  /** Year-to-date total per earning line-item label. */
  earnings: Record<string, number>;
  /** Year-to-date total per deduction line-item label. */
  deductions: Record<string, number>;
}

/**
 * Returns the tax-year window (start month/year) that contains `period`
 * (a "YYYY-MM" string), given the tax year's starting month (1-12).
 * South Africa's tax year starts in March by default.
 */
function taxYearBounds(period: string, taxYearStartMonth: number): { startKey: string; endKey: string } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  // If the current month is before the tax-year start month, the tax year
  // began in the previous calendar year.
  const startYear = month >= taxYearStartMonth ? year : year - 1;
  const startKey = `${startYear}-${String(taxYearStartMonth).padStart(2, "0")}`;
  return { startKey, endKey: period };
}

/**
 * Computes year-to-date totals for an employee, summing every payslip from the
 * start of the current tax year up to and including the given payslip's period.
 *
 * `allPayslips` should be the full set the caller has access to; it is filtered
 * to the target employee here.
 */
export function computePayslipYtd(
  allPayslips: Payslip[],
  employeeId: string,
  currentPeriod: string,
  taxYearStartMonth = 3
): PayslipYtd {
  const { startKey, endKey } = taxYearBounds(currentPeriod, taxYearStartMonth);

  const relevant = allPayslips.filter(
    (p) => p.employeeId === employeeId && p.period >= startKey && p.period <= endKey
  );

  const ytd: PayslipYtd = {
    basicSalary: 0,
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0,
    paye: 0,
    uif: 0,
    earnings: {},
    deductions: {},
  };

  for (const p of relevant) {
    ytd.basicSalary += p.basicSalary;
    ytd.grossPay += p.grossPay;
    ytd.totalDeductions += p.totalDeductions;
    ytd.netPay += p.netPay;
    ytd.paye += p.paye;
    ytd.uif += p.uif;
    for (const e of p.earnings) {
      ytd.earnings[e.label] = (ytd.earnings[e.label] ?? 0) + e.amount;
    }
    for (const d of p.deductions) {
      ytd.deductions[d.label] = (ytd.deductions[d.label] ?? 0) + d.amount;
    }
  }

  return ytd;
}
