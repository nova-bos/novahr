import Decimal from "decimal.js";
import type { Employee, Payslip, PayslipLineItem } from "@/lib/types";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const TAX_BRACKETS_2025 = [
  { upTo: 237_100, rate: "0.18", base: "0" },
  { upTo: 370_500, rate: "0.26", base: "42678" },
  { upTo: 512_800, rate: "0.31", base: "77362" },
  { upTo: 673_000, rate: "0.36", base: "121475" },
  { upTo: 857_900, rate: "0.39", base: "179147" },
  { upTo: 1_817_000, rate: "0.41", base: "251258" },
  { upTo: Infinity, rate: "0.45", base: "644489" },
];

const PRIMARY_REBATE_ANNUAL = new Decimal("17235");
const UIF_RATE = new Decimal("0.01");
const UIF_MONTHLY_CAP = new Decimal("177.12");

function annualPaye(annualTaxable: Decimal): Decimal {
  const taxable = annualTaxable.toNumber();
  const bracketIndex = TAX_BRACKETS_2025.findIndex((b) => taxable <= b.upTo);
  const bracket = TAX_BRACKETS_2025[bracketIndex];
  const prevUpTo = bracketIndex > 0 ? TAX_BRACKETS_2025[bracketIndex - 1].upTo : 0;

  const tax = new Decimal(bracket.base).plus(
    annualTaxable.minus(prevUpTo).times(bracket.rate)
  );
  const afterRebate = tax.minus(PRIMARY_REBATE_ANNUAL);
  return Decimal.max(afterRebate, 0);
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
  const basicSalary = new Decimal(salary.annualGross).dividedBy(12).toDecimalPlaces(2);

  const earnings: PayslipLineItem[] = [];
  if (salary.travelAllowance) {
    earnings.push({ label: "Travel Allowance", amount: salary.travelAllowance });
  }
  if (salary.housingAllowance) {
    earnings.push({ label: "Housing Allowance", amount: salary.housingAllowance });
  }

  const grossPay = earnings
    .reduce((sum, item) => sum.plus(item.amount), basicSalary)
    .toDecimalPlaces(2);

  const annualTaxable = basicSalary.times(12).toDecimalPlaces(0);
  const paye = annualPaye(annualTaxable).dividedBy(12).toDecimalPlaces(2);
  const uif = Decimal.min(grossPay.times(UIF_RATE), UIF_MONTHLY_CAP).toDecimalPlaces(2);

  const deductions: PayslipLineItem[] = [
    { label: "PAYE (Income Tax)", amount: paye.toNumber() },
    { label: "UIF Contribution", amount: uif.toNumber() },
  ];

  if (salary.pensionContributionPct) {
    const pension = basicSalary.times(salary.pensionContributionPct).toDecimalPlaces(2);
    deductions.push({ label: "Pension Fund", amount: pension.toNumber() });
  }

  if (salary.medicalAid) {
    deductions.push({ label: "Medical Aid", amount: salary.medicalAid });
  }

  const totalDeductions = deductions
    .reduce((sum, item) => sum.plus(item.amount), new Decimal(0))
    .toDecimalPlaces(2);

  const netPay = grossPay.minus(totalDeductions).toDecimalPlaces(2);

  return {
    basicSalary: basicSalary.toNumber(),
    earnings,
    deductions,
    grossPay: grossPay.toNumber(),
    totalDeductions: totalDeductions.toNumber(),
    netPay: netPay.toNumber(),
    paye: paye.toNumber(),
    uif: uif.toNumber(),
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
