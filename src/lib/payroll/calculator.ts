import Decimal from "decimal.js";
import type { Employee, Payslip, PayslipLineItem } from "@/lib/types";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

// 2026/27 tax year (1 March 2026 to 28 February 2027)
// Source: National Treasury Budget 2026 Tax Guide; verified line by line against
// sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals on 2026-07-04
// (brackets, bases, rebates, MATC R376/R376/R254, s11F cap R430,000).
// The under-65 tax threshold implied by these figures is R99,000, which is
// asserted in calculator.test.ts as a tripwire against silent edits.
// prevUpTo stored on each bracket to avoid index-based lookup and off-by-one risk
const TAX_BRACKETS_2026_27 = [
  { upTo: 245_100,   rate: "0.18", base: "0",       prevUpTo: 0 },
  { upTo: 383_100,   rate: "0.26", base: "44118",   prevUpTo: 245_100 },
  { upTo: 530_200,   rate: "0.31", base: "79998",   prevUpTo: 383_100 },
  { upTo: 695_800,   rate: "0.36", base: "125599",  prevUpTo: 530_200 },
  { upTo: 887_000,   rate: "0.39", base: "185215",  prevUpTo: 695_800 },
  { upTo: 1_878_600, rate: "0.41", base: "259783",  prevUpTo: 887_000 },
  { upTo: Infinity,  rate: "0.45", base: "666339",  prevUpTo: 1_878_600 },
];

const PRIMARY_REBATE_ANNUAL   = new Decimal("17820");
const SECONDARY_REBATE_ANNUAL = new Decimal("9765");  // age 65+
const TERTIARY_REBATE_ANNUAL  = new Decimal("3249");  // age 75+

// Statutory defaults used when a tenant has not customised PayrollSettings.
// UIF: 1% employee plus 1% employer on remuneration up to R17,712 per month
// (contribution cap R177.12). SDL: 1% employer levy.
export const STATUTORY_DEFAULTS = {
  uifEnabled: true,
  uifEmployeeRate: 0.01,
  uifEmployerRate: 0.01,
  uifCeiling: 17_712,
  sdlEnabled: true,
  sdlRate: 0.01,
} as const;

export interface StatutorySettings {
  uifEnabled: boolean;
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifCeiling: number;
  sdlEnabled: boolean;
  sdlRate: number;
}

// Medical Aid Tax Credits s6A -- 2026/27
const MATC_MAIN  = new Decimal("376");
const MATC_FIRST = new Decimal("376");
const MATC_EXTRA = new Decimal("254");

// Pension s11F deduction caps -- 2026/27
const PENSION_MAX_PCT  = new Decimal("0.275");
const PENSION_MAX_RAND = new Decimal("430000");

const DIVISORS = { monthly: 12, biweekly: 26, weekly: 52 } as const;

function getAgeInYears(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function totalRebate(dateOfBirth?: string): Decimal {
  if (!dateOfBirth) return PRIMARY_REBATE_ANNUAL;
  const age = getAgeInYears(dateOfBirth);
  let rebate = PRIMARY_REBATE_ANNUAL;
  if (age >= 65) rebate = rebate.plus(SECONDARY_REBATE_ANNUAL);
  if (age >= 75) rebate = rebate.plus(TERTIARY_REBATE_ANNUAL);
  return rebate;
}

function monthlyMatc(dependants: number): Decimal {
  if (dependants < 0) return new Decimal(0);
  let credit = MATC_MAIN;
  if (dependants >= 1) credit = credit.plus(MATC_FIRST);
  if (dependants > 1) credit = credit.plus(MATC_EXTRA.times(dependants - 1));
  return credit;
}

function annualPaye(annualTaxable: Decimal, dateOfBirth?: string): Decimal {
  const taxable = annualTaxable.toNumber();
  const bracket = TAX_BRACKETS_2026_27.find((b) => taxable <= b.upTo)!;
  const tax = new Decimal(bracket.base).plus(
    annualTaxable.minus(bracket.prevUpTo).times(bracket.rate)
  );
  return Decimal.max(tax.minus(totalRebate(dateOfBirth)), 0);
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
  employerUif: number;
  employerSdl: number;
}

export interface PayrollOptions {
  isSDLLiable?: boolean;
  unpaidLeaveDays?: number;
  workingDaysInMonth?: number;
  // Per-tenant statutory configuration from PayrollSettings. Falls back to
  // STATUTORY_DEFAULTS so client-side projections stay correct without a fetch.
  statutory?: StatutorySettings;
}

export function calculateMonthlyPayroll(
  employee: Employee,
  options: PayrollOptions = {}
): PayrollBreakdown {
  const { salary } = employee;
  const {
    isSDLLiable = false,
    unpaidLeaveDays = 0,
    workingDaysInMonth = 21,
    statutory = STATUTORY_DEFAULTS,
  } = options;

  const freq = salary.payFrequency in DIVISORS ? (salary.payFrequency as keyof typeof DIVISORS) : "monthly";
  const divisor = DIVISORS[freq];

  const basicSalary = new Decimal(salary.annualGross).dividedBy(divisor).toDecimalPlaces(2);

  const travelMonthly = new Decimal(salary.travelAllowance ?? 0);
  const housingMonthly = new Decimal(salary.housingAllowance ?? 0);

  const earnings: PayslipLineItem[] = [];
  if (salary.travelAllowance) earnings.push({ label: "Travel Allowance", amount: travelMonthly.toNumber() });
  if (salary.housingAllowance) earnings.push({ label: "Housing Allowance", amount: housingMonthly.toNumber() });

  // grossPay is the contractual amount before the unpaid deduction
  const grossPay = basicSalary.plus(travelMonthly).plus(housingMonthly).toDecimalPlaces(2);

  // Unpaid leave reduces the effective pay base used for all tax/levy calculations
  const unpaidDeduction = unpaidLeaveDays > 0
    ? basicSalary.times(unpaidLeaveDays).dividedBy(workingDaysInMonth).toDecimalPlaces(2)
    : new Decimal(0);
  const adjustedBasic = basicSalary.minus(unpaidDeduction);
  const adjustedGross = adjustedBasic.plus(travelMonthly).plus(housingMonthly);

  // Taxable income: 80% of travel (or 20% with SARS logbook), 100% of housing, minus s11F pension
  const travelInclusion = salary.hasLogbook ? new Decimal("0.20") : new Decimal("0.80");
  const travelTaxable = travelMonthly.times(travelInclusion);
  const annualRemuneration = adjustedBasic.plus(travelTaxable).plus(housingMonthly).times(divisor);

  const pensionMonthly = salary.pensionContributionPct
    ? adjustedBasic.times(salary.pensionContributionPct).toDecimalPlaces(2)
    : new Decimal(0);

  const pensionS11fDeduction = salary.pensionContributionPct
    ? Decimal.min(
        pensionMonthly.times(divisor),
        Decimal.min(annualRemuneration.times(PENSION_MAX_PCT), PENSION_MAX_RAND)
      )
    : new Decimal(0);

  const annualTaxable = annualRemuneration.minus(pensionS11fDeduction).toDecimalPlaces(0);

  // PAYE after bracket tax, rebates, and Medical Aid Tax Credit
  const annualPAYE = annualPaye(annualTaxable, employee.dateOfBirth);
  const matcAnnual =
    salary.medicalAid != null && salary.medicalAidDependants != null
      ? monthlyMatc(salary.medicalAidDependants).times(12)
      : new Decimal(0);
  const paye = Decimal.max(annualPAYE.minus(matcAnnual), 0).dividedBy(divisor).toDecimalPlaces(2);

  // UIF: employee and employer each contribute at the configured rate on
  // remuneration up to the monthly ceiling; both scale with pay frequency.
  const uifEmployeeRate = new Decimal(statutory.uifEmployeeRate);
  const uifEmployerRate = new Decimal(statutory.uifEmployerRate);
  const uifCapBase = new Decimal(statutory.uifCeiling).times(12).dividedBy(divisor);
  const uif = statutory.uifEnabled
    ? Decimal.min(adjustedGross.times(uifEmployeeRate), uifCapBase.times(uifEmployeeRate)).toDecimalPlaces(2)
    : new Decimal(0);
  const employerUif = statutory.uifEnabled
    ? Decimal.min(adjustedGross.times(uifEmployerRate), uifCapBase.times(uifEmployerRate)).toDecimalPlaces(2)
    : new Decimal(0);

  // SDL: employer cost only, not deducted from employee net pay
  const employerSdl = isSDLLiable && statutory.sdlEnabled
    ? adjustedGross.times(statutory.sdlRate).toDecimalPlaces(2)
    : new Decimal(0);

  const deductions: PayslipLineItem[] = [
    { label: "PAYE (Income Tax)", amount: paye.toNumber() },
  ];
  if (statutory.uifEnabled) {
    deductions.push({ label: "UIF Contribution", amount: uif.toNumber() });
  }

  if (unpaidLeaveDays > 0) {
    deductions.push({ label: "Unpaid Leave", amount: unpaidDeduction.toNumber() });
  }

  if (salary.pensionContributionPct) {
    deductions.push({ label: "Pension Fund", amount: pensionMonthly.toNumber() });
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
    employerUif: employerUif.toNumber(),
    employerSdl: employerSdl.toNumber(),
  };
}

export function buildPayslip(
  employee: Employee,
  runId: string,
  period: string,
  payDate: string,
  options: PayrollOptions = {}
): Payslip {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { employerSdl, employerUif, ...payslipData } = calculateMonthlyPayroll(employee, options);
  return {
    id: `${runId}-${employee.id}`,
    tenantId: employee.tenantId,
    runId,
    employeeId: employee.id,
    period,
    payDate,
    ...payslipData,
  };
}

export function incrementPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month, 1); // month is 0-indexed, so this is +1 month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
