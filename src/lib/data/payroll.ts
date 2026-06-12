import type { Employee, PayrollRun, Payslip } from "../types";
import { buildPayslip } from "../payroll-calc";
import { formatMonthYear } from "../format";
import { getEmployeesByTenant } from "./employees";
import { tenants } from "./tenants";

const HISTORY_PERIODS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
const UPCOMING_PERIOD = "2026-06";

function isEligible(employee: Employee, payDate: string): boolean {
  return employee.status !== "terminated" && employee.startDate <= payDate;
}

function generateForTenant(tenantId: string): { runs: PayrollRun[]; payslips: Payslip[] } {
  const tenant = tenants.find((t) => t.id === tenantId)!;
  const allEmployees = getEmployeesByTenant(tenantId);
  const runs: PayrollRun[] = [];
  const payslips: Payslip[] = [];

  for (const period of HISTORY_PERIODS) {
    const payDate = `${period}-${String(tenant.payDay).padStart(2, "0")}`;
    const eligible = allEmployees.filter((e) => isEligible(e, payDate));
    const runId = `${tenantId}-run-${period}`;
    const runPayslips = eligible.map((e) => buildPayslip(e, runId, period, payDate));

    payslips.push(...runPayslips);

    runs.push({
      id: runId,
      tenantId,
      period,
      label: `${formatMonthYear(period)} Payroll`,
      payDate,
      status: "completed",
      totalGross: round2(sum(runPayslips, (p) => p.grossPay)),
      totalDeductions: round2(sum(runPayslips, (p) => p.totalDeductions)),
      totalNet: round2(sum(runPayslips, (p) => p.netPay)),
      totalPaye: round2(sum(runPayslips, (p) => p.paye)),
      totalUif: round2(sum(runPayslips, (p) => p.uif)),
      employeeCount: runPayslips.length,
      payslipIds: runPayslips.map((p) => p.id),
      processedOn: `${period}-25T09:14:00`,
    });
  }

  // Upcoming scheduled run - not yet processed
  const upcomingPayDate = `${UPCOMING_PERIOD}-${String(tenant.payDay).padStart(2, "0")}`;
  const upcomingEligible = allEmployees.filter((e) => isEligible(e, upcomingPayDate));

  runs.push({
    id: `${tenantId}-run-${UPCOMING_PERIOD}`,
    tenantId,
    period: UPCOMING_PERIOD,
    label: `${formatMonthYear(UPCOMING_PERIOD)} Payroll`,
    payDate: upcomingPayDate,
    status: "scheduled",
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalPaye: 0,
    totalUif: 0,
    employeeCount: upcomingEligible.length,
    payslipIds: [],
  });

  return { runs, payslips };
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const generated = tenants.reduce<{ runs: PayrollRun[]; payslips: Payslip[] }>(
  (acc, tenant) => {
    const { runs, payslips } = generateForTenant(tenant.id);
    return {
      runs: [...acc.runs, ...runs],
      payslips: [...acc.payslips, ...payslips],
    };
  },
  { runs: [], payslips: [] }
);

export const payrollRuns: PayrollRun[] = generated.runs;
export const payslips: Payslip[] = generated.payslips;

export function getPayrollRunsByTenant(tenantId: string): PayrollRun[] {
  return payrollRuns
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function getPayslipsByRun(runId: string): Payslip[] {
  return payslips.filter((p) => p.runId === runId);
}

export function getPayslip(payslipId: string): Payslip | undefined {
  return payslips.find((p) => p.id === payslipId);
}

export function getPayslipsByEmployee(employeeId: string): Payslip[] {
  return payslips
    .filter((p) => p.employeeId === employeeId)
    .sort((a, b) => b.period.localeCompare(a.period));
}
