import type { Employee, Payslip, PayslipLineItem } from "./types";

const TAX_BRACKETS_2025 = [
  { upTo: 237_100, rate: 0.18, base: 0 },
  { upTo: 370_500, rate: 0.26, base: 42_678 },
  { upTo: 512_800, rate: 0.31, base: 77_362 },
  { upTo: 673_000, rate: 0.36, base: 121_475 },
  { upTo: 857_900, rate: 0.39, base: 179_147 },
  { upTo: 1_817_000, rate: 0.41, base: 251_258 },
  { upTo: Infinity, rate: 0.45, base: 644_489 },
];

const PRIMARY_REBATE_ANNUAL = 17_235;
const UIF_RATE = 0.01;
const UIF_MONTHLY_CAP = 177.12;

function annualPaye(annualTaxable: number): number {
  const bracket = TAX_BRACKETS_2025.find((b) => annualTaxable <= b.upTo);
  const prevUpTo = TAX_BRACKETS_2025[TAX_BRACKETS_2025.indexOf(bracket!) - 1]?.upTo ?? 0;
  const tax = bracket!.base + (annualTaxable - prevUpTo) * bracket!.rate;
  return Math.max(0, tax - PRIMARY_REBATE_ANNUAL);
}

export interface PayrollBreakdown {
  basicSalary: number;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  uif: number;
}

export function calculateMonthlyPayroll(employee: Employee): PayrollBreakdown {
  const { salary } = employee;
  const basicSalary = Math.round((salary.annualGross / 12) * 100) / 100;

  const earnings: PayslipLineItem[] = [];
  if (salary.travelAllowance) {
    earnings.push({ label: "Travel Allowance", amount: salary.travelAllowance });
  }
  if (salary.housingAllowance) {
    earnings.push({ label: "Housing Allowance", amount: salary.housingAllowance });
  }

  const grossPay =
    basicSalary + earnings.reduce((sum, item) => sum + item.amount, 0);

  const annualTaxable = Math.round(basicSalary * 12);
  const paye = Math.round(annualPaye(annualTaxable) / 12 * 100) / 100;
  const uif = Math.round(Math.min(grossPay * UIF_RATE, UIF_MONTHLY_CAP) * 100) / 100;

  const deductions: PayslipLineItem[] = [
    { label: "PAYE (Income Tax)", amount: paye },
    { label: "UIF Contribution", amount: uif },
  ];

  if (salary.pensionContributionPct) {
    const pension = Math.round(basicSalary * salary.pensionContributionPct * 100) / 100;
    deductions.push({ label: "Pension Fund", amount: pension });
  }

  if (salary.medicalAid) {
    deductions.push({ label: "Medical Aid", amount: salary.medicalAid });
  }

  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  return {
    basicSalary,
    earnings,
    deductions,
    grossPay: Math.round(grossPay * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay,
    paye,
    uif,
  };
}

export function buildPayslip(
  employee: Employee,
  runId: string,
  period: string,
  payDate: string
): Payslip {
  const breakdown = calculateMonthlyPayroll(employee);
  return {
    id: `${runId}-${employee.id}`,
    tenantId: employee.tenantId,
    runId,
    employeeId: employee.id,
    period,
    payDate,
    ...breakdown,
  };
}

export function incrementPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month, 1); // month is 0-indexed, so this is +1 month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
