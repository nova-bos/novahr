import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * IRP5 / IT3(a) tax certificate builder.
 *
 * An IRP5 is issued per employee per SARS tax year (1 March to 28/29 February)
 * and summarises income and deductions against SARS source codes. An IRP5 is
 * issued when PAYE was deducted; an IT3(a) when it was not (income below the
 * tax threshold). These feed the EMP501 reconciliation.
 *
 * IMPORTANT: the SARS source codes below must be VERIFIED against the current
 * official SARS PAYE BRS (Business Requirements Specification) before any real
 * certificate is issued or submitted, exactly as the ETI bands and PAYE tables
 * are treated. Codes and their meanings change between BRS versions.
 */
export const SARS_SOURCE_CODES = {
  income: "3601", // normal salary/wages (includes overtime)
  annualPayment: "3605", // bonus / 13th cheque
  commission: "3606",
  travelAllowance: "3701",
  otherAllowances: "3713",
  grossRemuneration: "3699", // total of the income codes
  pension: "4001", // employee pension fund contributions
  medicalAid: "4005", // medical aid contributions
  paye: "4102", // PAYE deducted
  uif: "4141", // UIF contribution
  totalDeductions: "4103", // total of the deduction codes (excl. PAYE/UIF)
} as const;

/**
 * The twelve period strings ("YYYY-MM") of a SA tax year. taxYear is
 * "YYYY/YYYY+1" (1 March YYYY to 28/29 February YYYY+1).
 */
export function taxYearPeriods(taxYear: string): string[] {
  const startYear = Number(taxYear.split("/")[0]);
  const periods: string[] = [];
  for (let m = 3; m <= 12; m++) periods.push(`${startYear}-${String(m).padStart(2, "0")}`);
  for (let m = 1; m <= 2; m++) periods.push(`${startYear + 1}-${String(m).padStart(2, "0")}`);
  return periods;
}

/** Aggregated tax-year amounts for one employee. All figures are annual totals. */
export interface Irp5Input {
  income: number; // basic salary plus overtime -> 3601
  annualPayment: number; // bonus -> 3605
  commission: number; // -> 3606
  travelAllowance: number; // -> 3701
  otherAllowances: number; // -> 3713
  pension: number; // -> 4001
  medicalAid: number; // -> 4005
  paye: number; // -> 4102
  uif: number; // -> 4141
}

export interface Irp5Line {
  code: string;
  label: string;
  amount: number;
}

export interface Irp5Certificate {
  type: "IRP5" | "IT3(a)";
  incomeLines: Irp5Line[];
  deductionLines: Irp5Line[];
  grossRemuneration: number; // code 3699
  totalDeductions: number; // code 4103 (pension + medical)
  paye: number; // code 4102
  uif: number; // code 4141
}

function n(v: number): number {
  return new Decimal(v || 0).toDecimalPlaces(2).toNumber();
}

/**
 * Builds an IRP5/IT3(a) certificate from an employee's aggregated tax-year
 * amounts. The certificate is an IRP5 when any PAYE was deducted, otherwise an
 * IT3(a). Zero-value income/deduction lines are omitted.
 */
export function buildIrp5(input: Irp5Input): Irp5Certificate {
  const incomeCandidates: Irp5Line[] = [
    { code: SARS_SOURCE_CODES.income, label: "Income", amount: n(input.income) },
    { code: SARS_SOURCE_CODES.annualPayment, label: "Annual payment", amount: n(input.annualPayment) },
    { code: SARS_SOURCE_CODES.commission, label: "Commission", amount: n(input.commission) },
    { code: SARS_SOURCE_CODES.travelAllowance, label: "Travel allowance", amount: n(input.travelAllowance) },
    { code: SARS_SOURCE_CODES.otherAllowances, label: "Other allowances", amount: n(input.otherAllowances) },
  ];
  const deductionCandidates: Irp5Line[] = [
    { code: SARS_SOURCE_CODES.pension, label: "Pension fund", amount: n(input.pension) },
    { code: SARS_SOURCE_CODES.medicalAid, label: "Medical aid contributions", amount: n(input.medicalAid) },
  ];

  const incomeLines = incomeCandidates.filter((l) => l.amount !== 0);
  const deductionLines = deductionCandidates.filter((l) => l.amount !== 0);

  const grossRemuneration = incomeLines
    .reduce((s, l) => s.plus(l.amount), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
  const totalDeductions = deductionLines
    .reduce((s, l) => s.plus(l.amount), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();

  const paye = n(input.paye);

  return {
    type: paye > 0 ? "IRP5" : "IT3(a)",
    incomeLines,
    deductionLines,
    grossRemuneration,
    totalDeductions,
    paye,
    uif: n(input.uif),
  };
}
