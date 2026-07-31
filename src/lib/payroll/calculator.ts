import Decimal from "decimal.js";
import type { Employee, EmployerBenefit, Payslip, PayslipLineItem } from "@/lib/types";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

// 2026/27 tax year (1 March 2026 to 28 February 2027)
// Source: National Treasury Budget 2026 Tax Guide; verified line by line against
// sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals on 2026-07-04
// (brackets, bases, rebates, MATC R376/R376/R254, s11F cap R430,000).
// The under-65 tax threshold implied by these figures is R99,000, which is
// asserted in calculator.test.ts as a tripwire against silent edits.
// These constants are additionally validated end to end against a real LifeCheq
// payslip by the "golden master: LifeCheq 2026/27 reconciliation" test. Do not
// change any tax constant to make a test pass; the numbers are correct.
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

/**
 * Annual PAYE for a given annual taxable income, after brackets and age rebates.
 * Exposed so callers (and the annual-payment delta method) can reuse the exact
 * same bracket/rebate logic. Returns a plain number of rands.
 */
export function annualTaxFor(annualTaxable: number, dateOfBirth?: string): number {
  return annualPaye(new Decimal(annualTaxable), dateOfBirth).toNumber();
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
  employerBenefits: EmployerBenefit[];
  /** Annual taxable income the PAYE tables were applied to. */
  taxableIncomeAnnual: number;
  /** Annual tax rebate (age-based) subtracted before arriving at PAYE. */
  taxRebateAnnual: number;
}

/**
 * A single variable-pay component supplied to the calculator for one employee
 * for one run (Phase 4). `amount` is always the final rand value: hours-based
 * components (overtime, sunday time, and so on) must have their
 * quantity x rate x statutory multiplier resolved to `amount` upstream. The
 * calculator only ever consumes `amount`; quantity/rate ride along for display.
 *
 * taxTreatment:
 *   "regular"        -> annualises like normal income (x12), raising annualised
 *                       taxable income and PAYE. Overtime, commission, shift,
 *                       standby, sunday, public holiday, allowances.
 *   "annual_payment" -> taxed via the SARS non-recurring delta method (see
 *                       annualPaymentPaye). Bonus, 13th cheque, back pay.
 */
export interface PayrollInputValue {
  componentType: string;
  label: string;
  amount: number;
  taxTreatment: "regular" | "annual_payment";
  quantity?: number;
  rate?: number;
}

export interface PayrollOptions {
  isSDLLiable?: boolean;
  unpaidLeaveDays?: number;
  workingDaysInMonth?: number;
  // Per-tenant statutory configuration from PayrollSettings. Falls back to
  // STATUTORY_DEFAULTS so client-side projections stay correct without a fetch.
  statutory?: StatutorySettings;
  // Optional variable-pay lines for this employee for this run. When absent or
  // empty, the calculation is byte-for-byte identical to the salaried path.
  inputs?: PayrollInputValue[];
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
    inputs = [],
  } = options;

  // Split variable-pay lines by tax treatment. Regular components annualise with
  // normal income; annual-payment components are taxed via the SARS delta method.
  // Custom cash deductions (deduction_custom) are post-tax and excluded from both
  // taxable buckets; they are handled as net-pay deductions further down.
  const earningInputs = inputs.filter((i) => i.componentType !== "deduction_custom");
  const regularInputs = earningInputs.filter((i) => i.taxTreatment !== "annual_payment");
  const annualPaymentInputs = earningInputs.filter((i) => i.taxTreatment === "annual_payment");
  const regularInputTotal = regularInputs.reduce(
    (sum, i) => sum.plus(i.amount),
    new Decimal(0)
  );
  const annualPaymentTotal = annualPaymentInputs.reduce(
    (sum, i) => sum.plus(i.amount),
    new Decimal(0)
  );

  const freq = salary.payFrequency in DIVISORS ? (salary.payFrequency as keyof typeof DIVISORS) : "monthly";
  const divisor = DIVISORS[freq];

  const basicSalary = new Decimal(salary.annualGross).dividedBy(divisor).toDecimalPlaces(2);

  const travelMonthly = new Decimal(salary.travelAllowance ?? 0);
  const housingMonthly = new Decimal(salary.housingAllowance ?? 0);

  const earnings: PayslipLineItem[] = [];
  if (salary.travelAllowance) earnings.push({ label: "Travel Allowance", amount: travelMonthly.toNumber() });
  if (salary.housingAllowance) earnings.push({ label: "Housing Allowance", amount: housingMonthly.toNumber() });

  // Variable-pay earning lines (both regular and annual-payment) appear on the
  // payslip as their own lines and are part of cash gross. Deduction-type custom
  // components are handled separately below and never appear here.
  for (const input of inputs) {
    if (input.componentType === "deduction_custom") continue;
    earnings.push({ label: input.label, amount: new Decimal(input.amount).toDecimalPlaces(2).toNumber() });
  }
  // Custom cash deductions supplied as variable inputs (post-tax).
  const customDeductionInputs = inputs.filter((i) => i.componentType === "deduction_custom");

  // grossPay is the contractual amount before the unpaid deduction, plus all
  // variable cash components (regular and annual-payment) for the month.
  const grossPay = basicSalary
    .plus(travelMonthly)
    .plus(housingMonthly)
    .plus(regularInputTotal)
    .plus(annualPaymentTotal)
    .toDecimalPlaces(2);

  // Unpaid leave reduces the effective pay base used for all tax/levy calculations
  const unpaidDeduction = unpaidLeaveDays > 0
    ? basicSalary.times(unpaidLeaveDays).dividedBy(workingDaysInMonth).toDecimalPlaces(2)
    : new Decimal(0);
  const adjustedBasic = basicSalary.minus(unpaidDeduction);
  const adjustedGross = adjustedBasic.plus(travelMonthly).plus(housingMonthly);

  // Employer-paid benefits. A taxable benefit is a fringe benefit: its value is
  // added to remuneration (PAYE, SDL, UIF) even though it is not cash and never
  // touches gross earnings or net pay. Non-taxable benefits are informational.
  const benefits = salary.employerBenefits ?? [];
  const taxableBenefitsMonthly = benefits.reduce(
    (sum, b) => (b.taxable ? sum.plus(b.amount) : sum),
    new Decimal(0)
  );

  // Taxable income: 80% of travel (or 20% with SARS logbook), 100% of housing,
  // plus taxable fringe benefits, minus s11F pension
  const travelInclusion = salary.hasLogbook ? new Decimal("0.20") : new Decimal("0.80");
  const travelTaxable = travelMonthly.times(travelInclusion);
  // Regular variable components raise the annualised taxable income exactly like
  // normal income: they are added to the monthly remuneration before x divisor.
  const annualRemuneration = adjustedBasic
    .plus(travelTaxable)
    .plus(housingMonthly)
    .plus(taxableBenefitsMonthly)
    .plus(regularInputTotal)
    .times(divisor);

  const pensionMonthly = salary.pensionContributionPct
    ? adjustedBasic.times(salary.pensionContributionPct).toDecimalPlaces(2)
    : new Decimal(0);

  // Personal retirement annuity processed through payroll. Combined with any
  // pension/provident contribution under the single s11F cap (27.5% of the
  // greater of remuneration or taxable income, up to the annual rand cap).
  const retirementAnnuityMonthly = salary.retirementAnnuity
    ? new Decimal(salary.retirementAnnuity).toDecimalPlaces(2)
    : new Decimal(0);

  const totalRetirementMonthly = pensionMonthly.plus(retirementAnnuityMonthly);

  const pensionS11fDeduction = totalRetirementMonthly.greaterThan(0)
    ? Decimal.min(
        totalRetirementMonthly.times(divisor),
        Decimal.min(annualRemuneration.times(PENSION_MAX_PCT), PENSION_MAX_RAND)
      )
    : new Decimal(0);

  const annualTaxable = annualRemuneration.minus(pensionS11fDeduction).toDecimalPlaces(0);
  // Exposed so payslips can show employees how their PAYE was derived.
  const taxRebateAnnual = totalRebate(employee.dateOfBirth);

  // PAYE after bracket tax, rebates, and Medical Aid Tax Credit
  const annualPAYE = annualPaye(annualTaxable, employee.dateOfBirth);
  // The medical tax credit applies to any medical scheme member, whether the
  // contribution runs through payroll or is paid privately.
  const isMedicalMember = salary.isMedicalAidMember === true || salary.medicalAid != null;
  const matcAnnual =
    isMedicalMember && salary.medicalAidDependants != null
      ? monthlyMatc(salary.medicalAidDependants).times(12)
      : new Decimal(0);
  const regularPaye = Decimal.max(annualPAYE.minus(matcAnnual), 0).dividedBy(divisor);

  // Annual-payment components (bonus, 13th cheque, back pay) are taxed once off,
  // NOT annualised. The SARS non-recurring method taxes them at the employee's
  // marginal position: PAYE on the component equals the extra annual tax it
  // creates, i.e. tax_on(annualTaxable + component) - tax_on(annualTaxable),
  // using the same bracket/rebate logic (annualPaye). This whole delta is added
  // to the month's PAYE. When there is no annual payment the delta is zero, so
  // the salaried monthly path is unchanged.
  const annualPaymentPaye = annualPaymentTotal.greaterThan(0)
    ? Decimal.max(
        annualPaye(annualTaxable.plus(annualPaymentTotal), employee.dateOfBirth).minus(
          annualPaye(annualTaxable, employee.dateOfBirth)
        ),
        0
      )
    : new Decimal(0);

  const paye = regularPaye.plus(annualPaymentPaye).toDecimalPlaces(2);

  // Leviable remuneration for UIF and SDL includes taxable fringe benefits and
  // all variable cash components (both regular and annual-payment) for the month.
  const leviableGross = adjustedGross
    .plus(taxableBenefitsMonthly)
    .plus(regularInputTotal)
    .plus(annualPaymentTotal);

  // UIF: employee and employer each contribute at the configured rate on
  // remuneration up to the monthly ceiling; both scale with pay frequency.
  const uifEmployeeRate = new Decimal(statutory.uifEmployeeRate);
  const uifEmployerRate = new Decimal(statutory.uifEmployerRate);
  const uifCapBase = new Decimal(statutory.uifCeiling).times(12).dividedBy(divisor);
  const uif = statutory.uifEnabled
    ? Decimal.min(leviableGross.times(uifEmployeeRate), uifCapBase.times(uifEmployeeRate)).toDecimalPlaces(2)
    : new Decimal(0);
  const employerUif = statutory.uifEnabled
    ? Decimal.min(leviableGross.times(uifEmployerRate), uifCapBase.times(uifEmployerRate)).toDecimalPlaces(2)
    : new Decimal(0);

  // SDL: employer cost only, not deducted from employee net pay
  const employerSdl = isSDLLiable && statutory.sdlEnabled
    ? leviableGross.times(statutory.sdlRate).toDecimalPlaces(2)
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

  if (salary.retirementAnnuity) {
    deductions.push({ label: "Retirement Annuity", amount: retirementAnnuityMonthly.toNumber() });
  }

  if (salary.medicalAid) {
    deductions.push({ label: "Medical Aid", amount: salary.medicalAid });
  }

  // Custom post-tax cash deductions captured as variable inputs. Appended last so
  // the salaried no-inputs deduction ordering stays byte-for-byte identical.
  for (const input of customDeductionInputs) {
    deductions.push({ label: input.label, amount: new Decimal(input.amount).toDecimalPlaces(2).toNumber() });
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
    employerBenefits: benefits,
    taxableIncomeAnnual: annualTaxable.toNumber(),
    taxRebateAnnual: taxRebateAnnual.toNumber(),
  };
}

export function buildPayslip(
  employee: Employee,
  runId: string,
  period: string,
  payDate: string,
  options: PayrollOptions = {}
): Payslip {
  const { employerSdl, employerUif, ...payslipData } = calculateMonthlyPayroll(employee, options);
  return {
    id: `${runId}-${employee.id}`,
    tenantId: employee.tenantId,
    runId,
    employeeId: employee.id,
    period,
    payDate,
    ...payslipData,
    employerUif,
    employerSdl,
  };
}

export function incrementPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month, 1); // month is 0-indexed, so this is +1 month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
