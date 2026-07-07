import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * The minimal employee shape ETI needs. Works with both the client-side
 * Employee type and a raw Prisma Employee row (which has no dateOfBirth column,
 * only idNumber). When dateOfBirth is absent it is derived from the SA ID.
 */
export interface EtiEmployee {
  idNumber: string;
  startDate: string | Date;
  dateOfBirth?: string | null;
}

/**
 * Derives date of birth (YYYY-MM-DD) from the first six digits of a South
 * African ID number (YYMMDD). The century is inferred: a two-digit year at or
 * below the current year's last two digits is treated as 2000s, otherwise
 * 1900s. Returns null for anything that is not a parseable 6-digit prefix.
 */
export function deriveDateOfBirthFromSaId(idNumber: string): string | null {
  const digits = (idNumber ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYy = new Date().getFullYear() % 100;
  const century = yy <= currentYy ? 2000 : 1900;
  const year = century + yy;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Employment Tax Incentive (ETI) engine.
 *
 * ETI reduces an employer's monthly PAYE liability for qualifying young
 * employees. It is claimed on the EMP201 and reduces the PAYE payable to SARS
 * (it is NOT a deduction from the employee's pay). An employer may claim ETI
 * for a maximum of 24 qualifying months per employee, at a higher rate in the
 * first 12 months and a lower rate in the second 12 months.
 *
 * IMPORTANT: the monetary bands below are tax-sensitive and change by Budget.
 * The values encoded here follow the structure effective 1 April 2025
 * (eligible remuneration up to R7,500; first-band 60%). Before this is used to
 * calculate a real EMP201 submission, VERIFY every threshold, rate and cap
 * against the current official SARS "Guide to the Employment Tax Incentive"
 * (sars.gov.za). Treat this the same way the PAYE tables in calculator.ts are
 * treated: verified line by line, with a tripwire test in eti.test.ts.
 */

// The maximum monthly remuneration for which any ETI may be claimed.
export const ETI_REMUNERATION_CEILING = new Decimal("7500");

// Minimum monthly wage gate. Where no sector wage regulation or bargaining
// council wage applies, the national minimum monthly figure is used as the
// floor below which ETI may not be claimed. Kept configurable per tenant.
export const ETI_DEFAULT_MIN_MONTHLY_WAGE = new Decimal("2000");

// The month (inclusive) from which ETI may first be claimed for any employee.
export const ETI_START_DATE = new Date("2013-10-01T00:00:00.000Z");

// Qualifying age window, measured at the last day of the month being processed.
export const ETI_MIN_AGE = 18;
export const ETI_MAX_AGE = 29;

// Total qualifying months an employer may claim per employee.
export const ETI_MAX_QUALIFYING_MONTHS = 24;

/**
 * A single formula band. `amount` is evaluated against the monthly
 * remuneration R when lowerInclusive <= R < upperExclusive.
 *   kind "percent": amount = rate * R
 *   kind "fixed":   amount = value
 *   kind "taper":   amount = value - taperRate * (R - lowerInclusive)
 */
type EtiBand =
  | { lowerInclusive: string; upperExclusive: string; kind: "percent"; rate: string }
  | { lowerInclusive: string; upperExclusive: string; kind: "fixed"; value: string }
  | { lowerInclusive: string; upperExclusive: string; kind: "taper"; value: string; taperRate: string };

// First 12 qualifying months. VERIFY against the current SARS ETI guide.
const ETI_BANDS_FIRST_12: EtiBand[] = [
  { lowerInclusive: "0",    upperExclusive: "2500", kind: "percent", rate: "0.60" },
  { lowerInclusive: "2500", upperExclusive: "5500", kind: "fixed",   value: "1500" },
  { lowerInclusive: "5500", upperExclusive: "7500", kind: "taper",   value: "1500", taperRate: "0.75" },
];

// Second 12 qualifying months (half the first-year values). VERIFY.
const ETI_BANDS_SECOND_12: EtiBand[] = [
  { lowerInclusive: "0",    upperExclusive: "2500", kind: "percent", rate: "0.30" },
  { lowerInclusive: "2500", upperExclusive: "5500", kind: "fixed",   value: "750" },
  { lowerInclusive: "5500", upperExclusive: "7500", kind: "taper",   value: "750", taperRate: "0.375" },
];

export type EtiDisqualification =
  | "age_out_of_range"
  | "no_id_number"
  | "employed_before_2013"
  | "remuneration_above_ceiling"
  | "below_minimum_wage"
  | "qualifying_months_exhausted"
  | "employment_type_excluded";

export interface EtiInput {
  /** The period being processed, "YYYY-MM". Age and tenure are measured here. */
  period: string;
  /** Age at the last day of the period. If omitted, derived from the employee. */
  age?: number;
  /** ETI remuneration for the month (gross, per the SARS definition). */
  monthlyRemuneration: number;
  /** Count of months already claimed for this employee (0 to 24). */
  monthsAlreadyClaimed: number;
  /** Minimum monthly wage floor for this employee. */
  minMonthlyWage?: number;
}

export interface EtiResult {
  qualifies: boolean;
  amount: number;
  /** 1..24 for the qualifying month this claim represents, else null. */
  qualifyingMonth: number | null;
  /** Reasons the employee does not qualify (empty when qualifies is true). */
  disqualifications: EtiDisqualification[];
}

function lastDayOfPeriod(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  // Day 0 of the next month is the last day of this month.
  return new Date(year, month, 0);
}

function ageAt(dateOfBirth: string, at: Date): number {
  const dob = new Date(dateOfBirth);
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

function bandAmount(bands: EtiBand[], remuneration: Decimal): Decimal {
  const band = bands.find(
    (b) =>
      remuneration.greaterThanOrEqualTo(b.lowerInclusive) &&
      remuneration.lessThan(b.upperExclusive)
  );
  if (!band) return new Decimal(0);
  if (band.kind === "percent") return remuneration.times(band.rate);
  if (band.kind === "fixed") return new Decimal(band.value);
  return Decimal.max(
    new Decimal(band.value).minus(remuneration.minus(band.lowerInclusive).times(band.taperRate)),
    0
  );
}

/**
 * Computes the ETI amount claimable for one employee for one month.
 * Returns qualifies=false with the failing reasons when not claimable.
 */
export function calculateEti(input: EtiInput, employee: EtiEmployee): EtiResult {
  const disqualifications: EtiDisqualification[] = [];

  const periodEnd = lastDayOfPeriod(input.period);
  const dateOfBirth = employee.dateOfBirth ?? deriveDateOfBirthFromSaId(employee.idNumber);
  const age = input.age ?? (dateOfBirth ? ageAt(dateOfBirth, periodEnd) : NaN);

  if (Number.isNaN(age) || age < ETI_MIN_AGE || age > ETI_MAX_AGE) {
    disqualifications.push("age_out_of_range");
  }

  if (!employee.idNumber) {
    disqualifications.push("no_id_number");
  }

  if (new Date(employee.startDate) < ETI_START_DATE) {
    disqualifications.push("employed_before_2013");
  }

  const remuneration = new Decimal(input.monthlyRemuneration);
  if (remuneration.greaterThanOrEqualTo(ETI_REMUNERATION_CEILING)) {
    disqualifications.push("remuneration_above_ceiling");
  }

  const minWage = new Decimal(input.minMonthlyWage ?? ETI_DEFAULT_MIN_MONTHLY_WAGE);
  if (remuneration.lessThan(minWage)) {
    disqualifications.push("below_minimum_wage");
  }

  if (
    input.monthsAlreadyClaimed < 0 ||
    input.monthsAlreadyClaimed >= ETI_MAX_QUALIFYING_MONTHS
  ) {
    disqualifications.push("qualifying_months_exhausted");
  }

  if (disqualifications.length > 0) {
    return { qualifies: false, amount: 0, qualifyingMonth: null, disqualifications };
  }

  const qualifyingMonth = input.monthsAlreadyClaimed + 1;
  const bands = qualifyingMonth <= 12 ? ETI_BANDS_FIRST_12 : ETI_BANDS_SECOND_12;
  const amount = bandAmount(bands, remuneration).toDecimalPlaces(2);

  return {
    qualifies: true,
    amount: amount.toNumber(),
    qualifyingMonth,
    disqualifications: [],
  };
}
