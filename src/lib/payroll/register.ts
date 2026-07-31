import type { Payslip } from "@/lib/types";

/**
 * Payroll register (Phase 6 HR outputs).
 *
 * A single per-run report: one row per employee on the run, plus a totals row.
 * It is derived purely from the run's payslips (the earnings/deductions JSON
 * snapshots persisted at completion), so it stays accurate for historical runs
 * even if an employee's configuration later changes. No database access here;
 * the calling server action supplies the tenant-scoped payslips and the light
 * employee lookup, keeping this module pure and unit-testable.
 */

/** Minimal employee shape the register needs, resolved by the caller. */
export interface RegisterEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  branchName?: string;
}

export interface PayrollRegisterRow {
  employeeNumber: string;
  name: string;
  branch: string;
  gross: number;
  basic: number;
  allowances: number;
  overtime: number;
  commission: number;
  bonus: number;
  paye: number;
  uif: number;
  otherDeductions: number;
  netPay: number;
  employerUif: number;
  employerSdl: number;
}

export interface PayrollRegister {
  rows: PayrollRegisterRow[];
  totals: Omit<PayrollRegisterRow, "employeeNumber" | "name" | "branch">;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Earnings whose label matches one of these keywords roll into the matching
// column; everything else falls into "allowances". Matching is case-insensitive
// and substring-based so "Night shift overtime" still lands in overtime.
const EARNING_BUCKETS: { key: "overtime" | "commission" | "bonus"; match: string[] }[] = [
  { key: "overtime", match: ["overtime"] },
  { key: "commission", match: ["commission"] },
  { key: "bonus", match: ["bonus", "13th cheque", "thirteenth"] },
];

// Deduction labels that are reported in their own column rather than "other".
const PAYE_LABELS = ["paye", "tax", "employees tax"];
const UIF_LABELS = ["uif"];

function classifyEarning(label: string): "overtime" | "commission" | "bonus" | "allowances" {
  const l = label.toLowerCase();
  for (const bucket of EARNING_BUCKETS) {
    if (bucket.match.some((m) => l.includes(m))) return bucket.key;
  }
  return "allowances";
}

function matchesAny(label: string, keywords: string[]): boolean {
  const l = label.toLowerCase().trim();
  return keywords.some((k) => l === k || l.includes(k));
}

/**
 * Builds a payroll register from a run's payslips. `employees` maps employeeId
 * to the display fields; a missing entry falls back to the payslip's own ids so
 * the row is never dropped.
 */
export function buildPayrollRegister(
  payslips: Payslip[],
  employees: Map<string, RegisterEmployee>
): PayrollRegister {
  const rows: PayrollRegisterRow[] = payslips.map((p) => {
    const emp = employees.get(p.employeeId);
    let allowances = 0;
    let overtime = 0;
    let commission = 0;
    let bonus = 0;
    for (const earning of p.earnings) {
      const bucket = classifyEarning(earning.label);
      if (bucket === "overtime") overtime += earning.amount;
      else if (bucket === "commission") commission += earning.amount;
      else if (bucket === "bonus") bonus += earning.amount;
      else allowances += earning.amount;
    }

    let otherDeductions = 0;
    for (const d of p.deductions) {
      // PAYE and UIF have their own columns; skip them from "other". Everything
      // else (medical aid, retirement, loans, garnishees) rolls into "other".
      if (matchesAny(d.label, PAYE_LABELS) || matchesAny(d.label, UIF_LABELS)) continue;
      otherDeductions += d.amount;
    }

    return {
      employeeNumber: emp?.employeeNumber ?? p.employeeId,
      name: emp ? `${emp.firstName} ${emp.lastName}` : p.employeeId,
      branch: emp?.branchName ?? "",
      gross: round2(p.grossPay),
      basic: round2(p.basicSalary),
      allowances: round2(allowances),
      overtime: round2(overtime),
      commission: round2(commission),
      bonus: round2(bonus),
      paye: round2(p.paye),
      uif: round2(p.uif),
      otherDeductions: round2(otherDeductions),
      netPay: round2(p.netPay),
      employerUif: round2(p.employerUif ?? 0),
      employerSdl: round2(p.employerSdl ?? 0),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      basic: acc.basic + r.basic,
      allowances: acc.allowances + r.allowances,
      overtime: acc.overtime + r.overtime,
      commission: acc.commission + r.commission,
      bonus: acc.bonus + r.bonus,
      paye: acc.paye + r.paye,
      uif: acc.uif + r.uif,
      otherDeductions: acc.otherDeductions + r.otherDeductions,
      netPay: acc.netPay + r.netPay,
      employerUif: acc.employerUif + r.employerUif,
      employerSdl: acc.employerSdl + r.employerSdl,
    }),
    {
      gross: 0,
      basic: 0,
      allowances: 0,
      overtime: 0,
      commission: 0,
      bonus: 0,
      paye: 0,
      uif: 0,
      otherDeductions: 0,
      netPay: 0,
      employerUif: 0,
      employerSdl: 0,
    }
  );

  // Round the accumulated totals once at the end to avoid drift.
  for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
    totals[key] = round2(totals[key]);
  }

  return { rows, totals };
}

/** Column headers for the register CSV, in row order. */
export const PAYROLL_REGISTER_HEADERS = [
  "Employee number",
  "Name",
  "Branch",
  "Gross",
  "Basic",
  "Allowances",
  "Overtime",
  "Commission",
  "Bonus",
  "PAYE",
  "UIF",
  "Other deductions",
  "Net pay",
  "Employer UIF",
  "Employer SDL",
] as const;

/** Serialises a register into CSV rows (values only), including a totals row. */
export function payrollRegisterToRows(register: PayrollRegister): (string | number)[][] {
  const rows: (string | number)[][] = register.rows.map((r) => [
    r.employeeNumber,
    r.name,
    r.branch,
    r.gross.toFixed(2),
    r.basic.toFixed(2),
    r.allowances.toFixed(2),
    r.overtime.toFixed(2),
    r.commission.toFixed(2),
    r.bonus.toFixed(2),
    r.paye.toFixed(2),
    r.uif.toFixed(2),
    r.otherDeductions.toFixed(2),
    r.netPay.toFixed(2),
    r.employerUif.toFixed(2),
    r.employerSdl.toFixed(2),
  ]);
  const t = register.totals;
  rows.push([
    "TOTAL",
    "",
    "",
    t.gross.toFixed(2),
    t.basic.toFixed(2),
    t.allowances.toFixed(2),
    t.overtime.toFixed(2),
    t.commission.toFixed(2),
    t.bonus.toFixed(2),
    t.paye.toFixed(2),
    t.uif.toFixed(2),
    t.otherDeductions.toFixed(2),
    t.netPay.toFixed(2),
    t.employerUif.toFixed(2),
    t.employerSdl.toFixed(2),
  ]);
  return rows;
}
